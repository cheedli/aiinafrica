import asyncio
import json
import os
import sys
import httpx
from typing import AsyncGenerator
from .reasoning import synthesize_report
from models.schemas import SSEEvent, StepType, ClinicalReport, Evidence, Diagnosis, ActionPlan

MANUS_BASE = "https://api.manus.ai/v2"
POLL_INTERVAL = 4  # seconds between polls

def _sse(type: StepType, message: str, data: dict = None) -> str:
    event = SSEEvent(type=type, message=message, data=data)
    return f"data: {event.model_dump_json()}\n\n"

def _heartbeat() -> str:
    """Keep SSE connection alive during long Manus runs."""
    return ": heartbeat\n\n"

def _headers() -> dict:
    return {
        "x-manus-api-key": os.getenv("MANUS_API_KEY", ""),
        "Content-Type": "application/json",
    }

def _build_manus_prompt(context: str) -> str:
    return f"""You are a clinical diagnostic AI agent investigating an undiagnosed patient case in Africa.

CRITICAL INSTRUCTIONS:
- Work ONLY with the patient data provided below. Do NOT ask for more information.
- If some fields are missing, use what you have and reason from it.
- Never request clarification. Never pause. Investigate immediately and completely.
- Use all available data: demographics, region, symptoms, history, labs, notes.

Your investigation steps:
1. Extract every clinical clue from the patient data below
2. Search PubMed for relevant literature matching the symptoms and demographics
3. Check Orphanet for rare diseases matching this presentation
4. Consider WHO epidemiological data for the patient's region in Africa
5. Produce a ranked differential diagnosis (3-5 conditions)

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

PATIENT CASE — investigate this now, do not ask for more data:
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
        print(f"[manus] task.detail raw: {json.dumps(data)[:500]}", file=sys.stderr, flush=True)
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


async def _send_tool_ping(task_id: str) -> None:
    """Ask Manus to report tools used so far — without stopping its work."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.post(
            f"{MANUS_BASE}/task.sendMessage",
            headers=_headers(),
            json={"task_id": task_id, "message": {"content": (
                "Do NOT pause or stop your investigation. Continue working immediately after this response.\n\n"
                "While continuing, return ONLY a raw JSON array (no markdown, no explanation) listing every tool you have called so far:\n"
                '[{"tool":"pubmed_search","query":"...","result":"one line summary"},{"tool":"browser","url":"...","result":"one line summary"}]\n\n'
                "Valid tool names: pubmed_search, orphanet_lookup, web_search, browser, who_data, icd_lookup. "
                "Then immediately resume your investigation."
            )}}
        )


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


def _parse_tool_ping(text: str) -> list | None:
    """Parse a JSON array of tool calls from a Manus ping response."""
    text = text.strip()
    # Strip markdown fences if present
    for fence in ("```json", "```"):
        if fence in text:
            try:
                start = text.index(fence) + len(fence)
                end = text.index("```", start)
                text = text[start:end].strip()
                break
            except Exception:
                pass
    # Must start with [ to be an array
    try:
        start = text.index("[")
        end = text.rindex("]") + 1
        data = json.loads(text[start:end])
        if isinstance(data, list) and data and isinstance(data[0], dict) and "tool" in data[0]:
            return data
    except Exception:
        pass
    return None


async def run_manus(context: str) -> AsyncGenerator[str, None]:
    # Step 1: Create Manus task
    yield _sse(StepType.STEP, "Dispatching case to Manus autonomous agent...")
    try:
        task_id = await _create_task(context)
    except Exception as e:
        yield _sse(StepType.ERROR, f"Failed to start Manus: {str(e)}")
        return

    task_url = f"https://manus.im/app/{task_id}"
    yield _sse(StepType.STEP, "Manus task created. Investigation in progress...")
    yield _sse(StepType.DATA, "Task started", {"task_id": task_id, "task_url": task_url})

    # Step 2: Poll for completion
    seen_msg_ids = set()
    final_content = None
    poll_count = 0
    max_polls = 150  # 10 minutes at 4s intervals
    heartbeat_counter = 0
    ping_counter = 0        # ping every ~30s (every 7-8 polls at 4s)
    seen_tools: set = set() # deduplicate tool calls across pings

    while poll_count < max_polls:
        await asyncio.sleep(POLL_INTERVAL)
        poll_count += 1
        heartbeat_counter += 1
        ping_counter += 1

        # Send heartbeat every 2 polls (~8s) to keep SSE connection alive
        if heartbeat_counter >= 2:
            yield _heartbeat()
            heartbeat_counter = 0

        # Ping Manus every 30s starting from 30s — first ping at poll 8 (~32s), then every 8 polls
        if ping_counter >= 8:
            ping_counter = 0
            try:
                await _send_tool_ping(task_id)
            except Exception:
                pass


        # Check status via task.detail
        try:
            status = await _get_task_status(task_id)
        except Exception:
            continue

        # Fetch ALL messages using no cursor — track seen by id
        try:
            msg_resp = await _list_messages(task_id)
            messages = msg_resp.get("messages", [])

            print(f"[manus] poll {poll_count}: status={status} msgs={len(messages)}", file=sys.stderr, flush=True)

            for msg in reversed(messages):
                msg_id = msg.get("id", "")
                if msg_id in seen_msg_ids:
                    continue
                seen_msg_ids.add(msg_id)
                print(f"[manus] new msg FULL: {json.dumps(msg)}", file=sys.stderr, flush=True)

                msg_type = msg.get("type", "")

                if msg_type == "status_update":
                    agent_status = msg.get("status_update", {}).get("agent_status", "")
                    brief = msg.get("status_update", {}).get("brief", "")
                    if brief and agent_status not in ("stopped",):
                        yield _sse(StepType.STEP, brief)
                    elif agent_status and agent_status not in ("stopped",):
                        yield _sse(StepType.STEP, agent_status)

                elif msg_type == "assistant_message":
                    content = msg.get("assistant_message", {}).get("content", "")
                    attachments = msg.get("assistant_message", {}).get("attachments", [])

                    if content:
                        is_report = "```json" in content or (len(content) > 500 and "differentials" in content)

                        # Try to parse as tool ping response (JSON array of tool calls)
                        tool_calls = _parse_tool_ping(content)
                        if tool_calls and not is_report:
                            for tc in tool_calls:
                                tool_key = f"{tc.get('tool')}:{tc.get('query','')}{tc.get('url','')}"
                                if tool_key not in seen_tools:
                                    seen_tools.add(tool_key)
                                    yield _sse(StepType.TOOL, tc.get("tool", "search"), {
                                        "tool": tc.get("tool", "search"),
                                        "query": tc.get("query") or tc.get("url", ""),
                                        "result": tc.get("result", "")
                                    })
                        elif is_report:
                            final_content = content
                            yield _sse(StepType.STEP, "Final diagnostic report received. Parsing...")
                        else:
                            # Stream full content as-is, not truncated
                            yield _sse(StepType.STEP, content.strip())
                            if not final_content:
                                final_content = content

                    for att in attachments:
                        if att.get("content_type") == "text/markdown" and att.get("url"):
                            try:
                                async with httpx.AsyncClient(timeout=15.0) as client:
                                    file_resp = await client.get(att["url"])
                                    if file_resp.status_code == 200:
                                        final_content = file_resp.text
                                        yield _sse(StepType.STEP, "Downloaded detailed clinical report...")
                            except Exception:
                                pass

                elif msg_type == "tool_use":
                    # Show tool calls so user sees what Manus is doing
                    tool_name = msg.get("tool_use", {}).get("name", "")
                    tool_input = msg.get("tool_use", {}).get("input", {})
                    if tool_name:
                        label = tool_name.replace("_", " ").title()
                        detail = ""
                        if "query" in tool_input:
                            detail = f": {tool_input['query']}"
                        elif "url" in tool_input:
                            detail = f": {tool_input['url']}"
                        elif "command" in tool_input:
                            detail = f": {str(tool_input['command'])[:80]}"
                        yield _sse(StepType.STEP, f"{label}{detail}")

        except Exception as ex:
            print(f"[manus] message fetch error: {ex}", file=sys.stderr, flush=True)

        # Early exit if we already have the structured report
        if final_content and ("```json" in final_content or (len(final_content) > 500 and "differentials" in final_content)):
            break

        if status in ("stopped", "completed", "finished", "done"):
            break
        elif status == "error":
            yield _sse(StepType.ERROR, "Manus encountered an error during investigation.")
            return

    if poll_count >= max_polls:
        yield _sse(StepType.ERROR, "Investigation timed out after 10 minutes.")
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
        # Manus finished but didn't return structured JSON — show what we have, don't burn Gemini quota
        if final_content:
            yield _sse(StepType.STEP, "Manus investigation complete. Awaiting structured report — Manus may still be finalizing.")
            yield _sse(StepType.ERROR, "Manus did not return a structured JSON report this run. Try re-running the investigation, or view the full output at the Manus link above.")
        else:
            yield _sse(StepType.ERROR, "Investigation ended without output. Manus may have timed out or been rate-limited. Please retry.")
