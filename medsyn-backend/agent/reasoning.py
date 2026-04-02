import google.generativeai as genai
import os
import json

def _get_model():
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    return genai.GenerativeModel("gemini-2.0-flash-exp")

EXTRACT_PROMPT = """You are a clinical AI assistant. Given the following patient input, extract:
1. Key symptoms (list)
2. Patient history summary (2-3 sentences)
3. Detected language (one of: English, French, Arabic)
4. Top 3 search queries for PubMed (focused on rare/undiagnosed diseases in Africa)
5. Top 3 disease names to check in Orphanet
6. Top 3 keywords for WHO regional lookup

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "symptoms": ["..."],
  "history_summary": "...",
  "detected_language": "...",
  "pubmed_queries": ["...", "...", "..."],
  "orphanet_queries": ["...", "...", "..."],
  "who_keywords": ["...", "..."]
}}

Patient Input:
{context}"""

SYNTHESIZE_PROMPT = """You are Manus, an expert clinical diagnostic AI. You have investigated a patient case.

Respond in {language}.

PATIENT CONTEXT:
{context}

PUBMED EVIDENCE FOUND:
{pubmed_evidence}

ORPHANET MATCHES:
{orphanet_data}

WHO REGIONAL CONTEXT:
{who_context}

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "patient_summary": "2-3 sentence summary",
  "differentials": [
    {{
      "rank": 1,
      "name": "Disease Name",
      "confidence": 0.85,
      "orpha_code": null,
      "orphanet_url": null,
      "icd11_code": null,
      "reasoning": "Why this fits the evidence",
      "regional_prevalence": "Prevalence context for Africa"
    }}
  ],
  "evidence_relevance": {{"pmid": "why relevant"}},
  "tests_to_order": ["Test 1"],
  "specialists_to_consult": ["Specialist 1"],
  "hypotheses_to_rule_out": ["Condition 1"],
  "who_context": "Regional epidemiological context"
}}

Provide 3-5 ranked differentials. Be precise and evidence-based."""

def _clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        text = "\n".join(lines)
    return text.strip()

async def extract_clinical_info(context: str) -> dict:
    model = _get_model()
    prompt = EXTRACT_PROMPT.format(context=context[:8000])
    response = model.generate_content(prompt)
    return json.loads(_clean_json(response.text))

async def synthesize_report(context: str, pubmed_evidence: list, orphanet_data: list, who_context: str, language: str) -> dict:
    model = _get_model()
    prompt = SYNTHESIZE_PROMPT.format(
        context=context[:4000],
        pubmed_evidence=json.dumps(pubmed_evidence[:6], indent=2)[:3000],
        orphanet_data=json.dumps(orphanet_data, indent=2)[:1000],
        who_context=who_context or "No specific regional data available.",
        language=language
    )
    response = model.generate_content(prompt)
    return json.loads(_clean_json(response.text))
