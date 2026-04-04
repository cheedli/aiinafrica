import asyncio
import json
import os
import httpx
from typing import AsyncGenerator
from .reasoning import synthesize_report
from models.schemas import SSEEvent, StepType, ClinicalReport, Evidence, Diagnosis, ActionPlan

MANUS_BASE = "https://api.manus.ai/v2"
POLL_INTERVAL = 4  # seconds between polls

def _sse(type: StepType, message: str, data: dict = None) -> str:
    event = SSEEvent(type=type, message=message, data=data)
    return f"data: {event.model_dump_json()}\n\n"

def _headers() -> dict:
    return {
        "x-manus-api-key": os.getenv("MANUS_API_KEY", ""),
        "Content-Type": "application/json",
    }

def _build_manus_prompt(context: str) -> str:
    return f"""You are a clinical diagnostic AI agent investigating an undiagnosed patient case in Africa.

Autonomously investigate this case by:
1. Identifying key symptoms and clinical features
2. Searching PubMed for relevant medical literature
3. Checking Orphanet for rare disease profiles matching the presentation
4. Considering WHO regional epidemiological data for Africa
5. Producing a ranked differential diagnosis (3-5 conditions)

Detect the language of the input (Arabic/French/English) and respond in the SAME language.

Return your final output as a JSON code block with this exact structure:
```json
{{
  "patient_summary": "2-3 sentence case summary",
  "detected_language": "English|French|Arabic",
  "differentials": [
    {{
      "rank": 1,
      "name": "Disease Name",
      "confidence": 0.85,
      "orpha_code": "123",
      "orphanet_url": "https://www.orpha.net/...",
      "icd11_code": "XY00",
      "reasoning": "Why this fits the evidence",
      "regional_prevalence": "Prevalence context for Africa"
    }}
  ],
  "evidence": [
    {{
      "pmid": "12345678",
      "title": "Paper title",
      "authors": "Author et al.",
      "journal": "Journal name",
      "year": 2023,
      "url": "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      "relevance_note": "Why this paper is relevant"
    }}
  ],
  "action_plan": {{
    "tests_to_order": ["Test 1", "Test 2"],
    "specialists_to_consult": ["Specialist 1"],
    "hypotheses_to_rule_out": ["Condition 1", "Condition 2"]
  }},
  "who_context": "Regional epidemiological context for Africa"
}}
```

PATIENT CASE:
{context}"""


async def _create_task(context: str) -> str:
    prompt = _build_manus_prompt(context)
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{MANUS_BASE}/task.create",
            headers=_headers(),
            json={"message": {"content": prompt}}
        )
        data = resp.json()
        if not data.get("ok"):
            raise Exception(f"Manus task creation failed: {data.get('error', {}).get('message', str(data))}")
        return data["task_id"]


async def _get_task_status(task_id: str) -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{MANUS_BASE}/task.detail",
            headers=_headers(),
            params={"task_id": task_id}
        )
        data = resp.json()
        return data.get("task", {}).get("status", "running")


async def _list_messages(task_id: str, cursor: str = None) -> dict:
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
    text = text.strip()
    # Try ```json block
    if "```json" in text:
        try:
            start = text.index("```json") + 7
            end = text.index("```", start)
            return json.loads(text[start:end].strip())
        except Exception:
            pass
    # Try ``` block
    if "```" in text:
        try:
            start = text.index("```") + 3
            end = text.index("```", start)
            return json.loads(text[start:end].strip())
        except Exception:
            pass
    # Try raw JSON object
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return None


async def run_manus(context: str) -> AsyncGenerator[str, None]:
    # Step 1: Create Manus task
    yield _sse(StepType.STEP, "Dispatching case to Manus autonomous agent...")
    try:
        task_id = await _create_task(context)
    except Exception as e:
        yield _sse(StepType.ERROR, f"Failed to start Manus: {str(e)}")
        return

    yield _sse(StepType.STEP, f"Manus task created. Investigation in progress...")
    yield _sse(StepType.DATA, "Task started", {"task_id": task_id})

    # Step 2: Poll for completion using task.detail
    seen_msg_ids = set()
    final_content = None
    poll_count = 0
    max_polls = 90  # 6 minutes at 4s intervals

    while poll_count < max_polls:
        await asyncio.sleep(POLL_INTERVAL)
        poll_count += 1

        # Check status via task.detail
        try:
            status = await _get_task_status(task_id)
        except Exception:
            continue

        # Also fetch messages to stream live progress
        try:
            msg_resp = await _list_messages(task_id)
            messages = msg_resp.get("messages", [])

            # Messages come in reverse chronological order — process all
            for msg in reversed(messages):
                msg_id = msg.get("id", "")
                if msg_id in seen_msg_ids:
                    continue
                seen_msg_ids.add(msg_id)

                msg_type = msg.get("type", "")

                if msg_type == "status_update":
                    agent_status = msg.get("status_update", {}).get("agent_status", "")
                    brief = msg.get("status_update", {}).get("brief", "")
                    if brief and agent_status == "running":
                        yield _sse(StepType.STEP, f"Manus: {brief}")

                elif msg_type == "assistant_message":
                    content = msg.get("assistant_message", {}).get("content", "")
                    attachments = msg.get("assistant_message", {}).get("attachments", [])

                    if content:
                        snippet = content[:150].replace("\n", " ").strip()
                        yield _sse(StepType.STEP, f"Manus: {snippet}{'...' if len(content) > 150 else ''}")
                        final_content = content  # keep updating — last is final

                    # Download markdown attachment if present
                    for att in attachments:
                        if att.get("content_type") == "text/markdown" and att.get("url"):
                            try:
                                async with httpx.AsyncClient(timeout=15.0) as client:
                                    file_resp = await client.get(att["url"])
                                    if file_resp.status_code == 200:
                                        final_content = file_resp.text
                                        yield _sse(StepType.STEP, "Manus: Downloaded detailed clinical report...")
                            except Exception:
                                pass

        except Exception:
            pass

        if status == "stopped":
            break
        elif status == "error":
            yield _sse(StepType.ERROR, "Manus encountered an error during investigation.")
            return

    if poll_count >= max_polls:
        yield _sse(StepType.ERROR, "Investigation timed out after 6 minutes.")
        return

    yield _sse(StepType.STEP, "Manus investigation complete. Parsing clinical report...")

    # Step 3: Parse structured report from Manus output
    report_data = None
    if final_content:
        report_data = _parse_report_from_text(final_content)

    if report_data:
        language = report_data.get("detected_language", "English")
        differentials_raw = report_data.get("differentials", [])
        yield _sse(StepType.STEP, f"Detected language: {language}. Built {len(differentials_raw)} ranked differentials.")

        differentials = []
        for d in differentials_raw:
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

        yield _sse(StepType.SECTION, "differentials", {"differentials": [d.model_dump() for d in differentials]})

        evidence_list = []
        for e in report_data.get("evidence", []):
            try:
                pmid = str(e.get("pmid", ""))
                evidence_list.append(Evidence(
                    pmid=pmid,
                    title=e.get("title", ""),
                    authors=e.get("authors", ""),
                    journal=e.get("journal", ""),
                    year=int(e.get("year", 2000)),
                    url=e.get("url", f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"),
                    relevance_note=e.get("relevance_note", "")
                ))
            except Exception:
                continue

        yield _sse(StepType.SECTION, "evidence", {"evidence": [e.model_dump() for e in evidence_list[:6]]})

        ap = report_data.get("action_plan", {})
        action_plan = ActionPlan(
            tests_to_order=ap.get("tests_to_order", []),
            specialists_to_consult=ap.get("specialists_to_consult", []),
            hypotheses_to_rule_out=ap.get("hypotheses_to_rule_out", [])
        )
        yield _sse(StepType.SECTION, "action_plan", {"action_plan": action_plan.model_dump()})

        who_context = report_data.get("who_context", "")
        if who_context:
            yield _sse(StepType.SECTION, "who_context", {"who_context": who_context})

        full_report = ClinicalReport(
            patient_summary=report_data.get("patient_summary", ""),
            detected_language=language,
            differentials=differentials,
            evidence=evidence_list[:6],
            action_plan=action_plan,
            who_context=who_context or None
        )
        yield _sse(StepType.DONE, "Investigation complete.", {"report": full_report.model_dump()})

    else:
        # Manus responded but not in structured JSON — use Gemini to structure it
        yield _sse(StepType.STEP, "Structuring Manus output through Gemini reasoning module...")
        try:
            report_data = await synthesize_report(
                context=context,
                pubmed_evidence=[],
                orphanet_data=[],
                who_context=final_content or "Manus investigation complete.",
                language="English"
            )
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

            ap = ActionPlan(
                tests_to_order=report_data.get("tests_to_order", []),
                specialists_to_consult=report_data.get("specialists_to_consult", []),
                hypotheses_to_rule_out=report_data.get("hypotheses_to_rule_out", [])
            )
            full_report = ClinicalReport(
                patient_summary=report_data.get("patient_summary", ""),
                detected_language="English",
                differentials=differentials,
                evidence=[],
                action_plan=ap,
                who_context=report_data.get("who_context")
            )
            yield _sse(StepType.SECTION, "differentials", {"differentials": [d.model_dump() for d in differentials]})
            yield _sse(StepType.SECTION, "action_plan", {"action_plan": ap.model_dump()})
            yield _sse(StepType.DONE, "Investigation complete.", {"report": full_report.model_dump()})
        except Exception as e:
            yield _sse(StepType.ERROR, f"Could not parse Manus output: {str(e)}")
