import asyncio
import json
from typing import AsyncGenerator
from .reasoning import extract_clinical_info, synthesize_report
from .tools.pubmed import search_pubmed
from .tools.orphanet import query_orphanet
from .tools.who_gho import get_regional_context
from models.schemas import SSEEvent, StepType, ClinicalReport, Evidence, Diagnosis, ActionPlan

def _sse(type: StepType, message: str, data: dict = None) -> str:
    event = SSEEvent(type=type, message=message, data=data)
    return f"data: {event.model_dump_json()}\n\n"

async def run_manus(context: str) -> AsyncGenerator[str, None]:
    yield _sse(StepType.STEP, "Analyzing patient input and extracting clinical features...")
    try:
        clinical_info = await extract_clinical_info(context)
    except Exception as e:
        yield _sse(StepType.ERROR, f"Failed to parse patient input: {str(e)}")
        return

    language = clinical_info.get("detected_language", "English")
    symptoms = clinical_info.get("symptoms", [])
    pubmed_queries = clinical_info.get("pubmed_queries", [])
    orphanet_queries = clinical_info.get("orphanet_queries", [])
    who_keywords = clinical_info.get("who_keywords", [])

    yield _sse(StepType.STEP, f"Detected language: {language}. Identified {len(symptoms)} key symptoms.")
    yield _sse(StepType.DATA, "Symptoms extracted", {"symptoms": symptoms, "language": language})

    yield _sse(StepType.STEP, f"Querying PubMed with {len(pubmed_queries)} targeted searches...")
    pubmed_tasks = [search_pubmed(q) for q in pubmed_queries[:3]]
    orphanet_tasks = [query_orphanet(d) for d in orphanet_queries[:3]]
    who_task = get_regional_context(who_keywords)

    pubmed_results_nested, orphanet_results, who_context = await asyncio.gather(
        asyncio.gather(*pubmed_tasks),
        asyncio.gather(*orphanet_tasks),
        who_task
    )

    seen_pmids = set()
    pubmed_evidence = []
    for result_list in pubmed_results_nested:
        for ev in result_list:
            if ev.pmid not in seen_pmids:
                seen_pmids.add(ev.pmid)
                pubmed_evidence.append(ev)

    orphanet_data = [r for r in orphanet_results if r is not None]

    yield _sse(StepType.STEP, f"PubMed: found {len(pubmed_evidence)} relevant articles.")
    yield _sse(StepType.DATA, "PubMed results", {"count": len(pubmed_evidence), "queries": pubmed_queries})
    yield _sse(StepType.STEP, f"Orphanet: matched {len(orphanet_data)} rare disease profiles.")
    yield _sse(StepType.DATA, "Orphanet results", {"diseases": [d.get("name") for d in orphanet_data]})
    yield _sse(StepType.STEP, "Querying WHO Global Health Observatory for regional epidemiological context...")
    yield _sse(StepType.DATA, "WHO context", {"context": who_context})
    yield _sse(StepType.STEP, "Synthesizing evidence through clinical reasoning module (Gemini 2.0)...")

    try:
        report_data = await synthesize_report(
            context=context,
            pubmed_evidence=[e.model_dump() for e in pubmed_evidence],
            orphanet_data=orphanet_data,
            who_context=who_context,
            language=language
        )
    except Exception as e:
        yield _sse(StepType.ERROR, f"Synthesis failed: {str(e)}")
        return

    yield _sse(StepType.STEP, "Building ranked differential diagnosis...")

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

    yield _sse(StepType.SECTION, "differentials", {"differentials": [d.model_dump() for d in differentials]})

    evidence_relevance = report_data.get("evidence_relevance", {})
    for ev in pubmed_evidence:
        ev.relevance_note = evidence_relevance.get(ev.pmid, "Supporting evidence")

    yield _sse(StepType.SECTION, "evidence", {"evidence": [e.model_dump() for e in pubmed_evidence[:6]]})

    action_plan = ActionPlan(
        tests_to_order=report_data.get("tests_to_order", []),
        specialists_to_consult=report_data.get("specialists_to_consult", []),
        hypotheses_to_rule_out=report_data.get("hypotheses_to_rule_out", [])
    )
    yield _sse(StepType.SECTION, "action_plan", {"action_plan": action_plan.model_dump()})
    yield _sse(StepType.SECTION, "who_context", {"who_context": report_data.get("who_context", who_context or "")})

    full_report = ClinicalReport(
        patient_summary=report_data.get("patient_summary", ""),
        detected_language=language,
        differentials=differentials,
        evidence=pubmed_evidence[:6],
        action_plan=action_plan,
        who_context=report_data.get("who_context", who_context or "")
    )

    yield _sse(StepType.DONE, "Investigation complete.", {"report": full_report.model_dump()})
