import asyncio
import json
import os
import httpx
from typing import AsyncGenerator
from .reasoning import synthesize_report
from models.schemas import SSEEvent, StepType, ClinicalReport, Evidence, Diagnosis, ActionPlan

MANUS_BASE = "https://api.manus.ai/v2"
POLL_INTERVAL = 3  # seconds between polls

def _sse(type: StepType, message: str, data: dict = None) -> str:
    event = SSEEvent(type=type, message=message, data=data)
    return f"data: {event.model_dump_json()}\n\n"

def _headers() -> dict:
    return {
        "x-manus-api-key": os.getenv("MANUS_API_KEY", ""),
        "Content-Type": "application/json",
    }

def _build_manus_prompt(context: str) -> str:
    return f"""You are a clinical diagnostic AI agent. A clinician has submitted a patient case.
Your task is to investigate this case autonomously:

1. Identify the key symptoms and clinical features
2. Search PubMed for relevant medical literature on the likely conditions
3. Check Orphanet for rare disease profiles matching the presentation
4. Consider WHO regional epidemiological data for Africa
5. Produce a ranked differential diagnosis (3-5 conditions) with:
   - Confidence score (0-100%)
   - Evidence-backed reasoning
   - Relevant Orphanet codes if applicable
   - ICD-11 codes
   - Regional prevalence context for Africa
6. Provide an action plan: tests to order, specialists to consult, hypotheses to rule out
7. Detect the language of the input (Arabic/French/English) and respond in the same language

Return your final output as a structured JSON report with these fields:
- patient_summary (string)
- detected_language (string)
- differentials (array of: rank, name, confidence 0-1, orpha_code, orphanet_url, icd11_code, reasoning, regional_prevalence)
- evidence (array of: pmid, title, authors, journal, year, url, relevance_note)
- action_plan (object: tests_to_order, specialists_to_consult, hypotheses_to_rule_out)
- who_context (string)

PATIENT CASE:
{context}"""


async def _create_task(context: str) -> str | None:
    prompt = _build_manus_prompt(context)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{MANUS_BASE}/task.create",
            headers=_headers(),
            json={"message": {"content": prompt}}
        )
        data = resp.json()
        if not data.get("ok"):
            raise Exception(f"Manus task creation failed: {data.get('error', {}).get('message', 'Unknown error')}")
        return data["data"]["id"]


async def _poll_messages(task_id: str, cursor: str = None) -> dict:
    params = {"task_id": task_id}
    if cursor:
        params["cursor"] = cursor
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{MANUS_BASE}/task.listMessages",
            headers=_headers(),
            params=params
        )
        return resp.json()


def _parse_report_from_text(text: str) -> dict | None:
    """Extract JSON report from Manus final message."""
    # Try to find JSON block in the response
    text = text.strip()
    # Look for ```json blocks
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.index("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.index("```") + 3
        end = text.index("```", start)
        text = text[start:end].strip()
    # Try to find raw JSON object
    if text.startswith("{"):
        try:
            return json.loads(text)
        except Exception:
            pass
    # Try to find JSON anywhere in text
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return None


def _build_report_from_data(report_data: dict, language: str) -> ClinicalReport:
    differentials = []
    for d in report_data.get("differentials", []):
        try:
            differentials.append(Diagnosis(
                rank=int(d.get("rank", 0)),
                name=d.get("name", "Unknown"),
                confidence=min(max(float(d.get("confidence", 0.5)), 0.0), 1.0),
                orpha_code=d.get("orpha_code"),
                orphanet_url=d.get("orphanet_url"),
                icd11_code=d.get("icd11_code"),
                reasoning=d.get("reasoning", ""),
                regional_prevalence=d.get("regional_prevalence")
            ))
        except Exception:
            continue

    evidence = []
    for e in report_data.get("evidence", []):
        try:
            evidence.append(Evidence(
                pmid=str(e.get("pmid", "")),
                title=e.get("title", ""),
                authors=e.get("authors", ""),
                journal=e.get("journal", ""),
                year=int(e.get("year", 2000)),
                url=e.get("url", f"https://pubmed.ncbi.nlm.nih.gov/{e.get('pmid', '')}/" ),
                relevance_note=e.get("relevance_note", "")
            ))
        except Exception:
            continue

    action_plan = ActionPlan(
        tests_to_order=report_data.get("action_plan", {}).get("tests_to_order", []),
        specialists_to_consult=report_data.get("action_plan", {}).get("specialists_to_consult", []),
        hypotheses_to_rule_out=report_data.get("action_plan", {}).get("hypotheses_to_rule_out", [])
    )

    return ClinicalReport(
        patient_summary=report_data.get("patient_summary", ""),
        detected_language=report_data.get("detected_language", language),
        differentials=differentials,
        evidence=evidence,
        action_plan=action_plan,
        who_context=report_data.get("who_context")
    )


async def run_manus(context: str) -> AsyncGenerator[str, None]:
    # Step 1: Create Manus task
    yield _sse(StepType.STEP, "Dispatching case to Manus autonomous agent...")
    try:
        task_id = await _create_task(context)
    except Exception as e:
        yield _sse(StepType.ERROR, f"Failed to start Manus: {str(e)}")
        return

    yield _sse(StepType.STEP, f"Manus task created (ID: {task_id[:8]}...). Investigation in progress...")
    yield _sse(StepType.DATA, "Task started", {"task_id": task_id})

    # Step 2: Poll for progress
    cursor = None
    seen_content = set()
    agent_status = "running"
    final_text = None
    poll_count = 0
    max_polls = 120  # 6 minutes max

    step_messages = [
        "Manus is reading the patient case...",
        "Manus is searching PubMed for relevant literature...",
        "Manus is querying Orphanet rare disease registry...",
        "Manus is cross-referencing WHO regional epidemiological data...",
        "Manus is synthesizing evidence and building differential diagnosis...",
        "Manus is finalizing the clinical brief...",
    ]

    while agent_status == "running" and poll_count < max_polls:
        await asyncio.sleep(POLL_INTERVAL)
        poll_count += 1

        try:
            result = await _poll_messages(task_id, cursor)
        except Exception:
            await asyncio.sleep(POLL_INTERVAL)
            continue

        if not result.get("ok"):
            continue

        data = result.get("data", {})
        messages = data.get("messages", [])
        agent_status = data.get("agent_status", "running")
        next_cursor = data.get("next_cursor")
        if next_cursor:
            cursor = next_cursor

        # Stream any new assistant messages as steps
        for msg in messages:
            msg_id = msg.get("id", "")
            role = msg.get("role", "")
            content = msg.get("content", "")

            if msg_id in seen_content or not content:
                continue
            seen_content.add(msg_id)

            if role == "assistant" and isinstance(content, str) and len(content) > 10:
                # Show a snippet of what Manus is doing
                snippet = content[:120].replace("\n", " ").strip()
                if snippet:
                    yield _sse(StepType.STEP, f"Manus: {snippet}{'...' if len(content) > 120 else ''}")
                final_text = content  # keep updating — last one is the final output

        # Emit progress hints
        if poll_count <= len(step_messages) and poll_count % 3 == 0:
            idx = min(poll_count // 3, len(step_messages) - 1)
            yield _sse(StepType.STEP, step_messages[idx])

        if agent_status == "waiting":
            yield _sse(StepType.STEP, "Manus is waiting for confirmation — auto-continuing...")
            # Auto-confirm if possible
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"{MANUS_BASE}/task.confirmAction",
                        headers=_headers(),
                        json={"task_id": task_id}
                    )
            except Exception:
                pass
            agent_status = "running"

    if agent_status == "error":
        yield _sse(StepType.ERROR, "Manus encountered an error during investigation.")
        return

    if poll_count >= max_polls:
        yield _sse(StepType.ERROR, "Investigation timed out after 6 minutes.")
        return

    yield _sse(StepType.STEP, "Manus investigation complete. Parsing clinical report...")

    # Step 3: Parse the report from Manus output
    report_data = None
    language = "English"

    if final_text:
        report_data = _parse_report_from_text(final_text)

    if report_data:
        language = report_data.get("detected_language", "English")
        differentials = report_data.get("differentials", [])

        yield _sse(StepType.STEP, f"Detected language: {language}. Built {len(differentials)} ranked differentials.")

        # Stream sections progressively
        parsed_differentials = []
        for d in differentials:
            try:
                parsed_differentials.append(Diagnosis(
                    rank=int(d.get("rank", 0)),
                    name=d.get("name", "Unknown"),
                    confidence=min(max(float(d.get("confidence", 0.5)), 0.0), 1.0),
                    orpha_code=d.get("orpha_code"),
                    orphanet_url=d.get("orphanet_url"),
                    icd11_code=d.get("icd11_code"),
                    reasoning=d.get("reasoning", ""),
                    regional_prevalence=d.get("regional_prevalence")
                ))
            except Exception:
                continue

        yield _sse(StepType.SECTION, "differentials", {
            "differentials": [d.model_dump() for d in parsed_differentials]
        })

        evidence_list = []
        for e in report_data.get("evidence", []):
            try:
                evidence_list.append(Evidence(
                    pmid=str(e.get("pmid", "")),
                    title=e.get("title", ""),
                    authors=e.get("authors", ""),
                    journal=e.get("journal", ""),
                    year=int(e.get("year", 2000)),
                    url=e.get("url", f"https://pubmed.ncbi.nlm.nih.gov/{e.get('pmid', '')}/"),
                    relevance_note=e.get("relevance_note", "")
                ))
            except Exception:
                continue

        yield _sse(StepType.SECTION, "evidence", {
            "evidence": [e.model_dump() for e in evidence_list[:6]]
        })

        action_plan = ActionPlan(
            tests_to_order=report_data.get("action_plan", {}).get("tests_to_order", []),
            specialists_to_consult=report_data.get("action_plan", {}).get("specialists_to_consult", []),
            hypotheses_to_rule_out=report_data.get("action_plan", {}).get("hypotheses_to_rule_out", [])
        )
        yield _sse(StepType.SECTION, "action_plan", {"action_plan": action_plan.model_dump()})

        who_context = report_data.get("who_context", "")
        if who_context:
            yield _sse(StepType.SECTION, "who_context", {"who_context": who_context})

        full_report = ClinicalReport(
            patient_summary=report_data.get("patient_summary", ""),
            detected_language=language,
            differentials=parsed_differentials,
            evidence=evidence_list[:6],
            action_plan=action_plan,
            who_context=who_context
        )

        yield _sse(StepType.DONE, "Investigation complete.", {"report": full_report.model_dump()})

    else:
        # Manus responded but not in structured JSON — stream raw and do a best-effort parse via Gemini
        yield _sse(StepType.STEP, "Structuring Manus output through reasoning module...")
        try:
            report_data = await synthesize_report(
                context=context,
                pubmed_evidence=[],
                orphanet_data=[],
                who_context=final_text or "Manus investigation complete.",
                language="English"
            )
            full_report = _build_report_from_data(report_data, "English")
            yield _sse(StepType.SECTION, "differentials", {"differentials": [d.model_dump() for d in full_report.differentials]})
            yield _sse(StepType.SECTION, "evidence", {"evidence": [e.model_dump() for e in full_report.evidence]})
            yield _sse(StepType.SECTION, "action_plan", {"action_plan": full_report.action_plan.model_dump()})
            yield _sse(StepType.DONE, "Investigation complete.", {"report": full_report.model_dump()})
        except Exception as e:
            yield _sse(StepType.ERROR, f"Could not parse Manus output: {str(e)}")
