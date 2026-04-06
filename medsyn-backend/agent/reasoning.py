from google import genai
from google.genai import types
import os
import json

def _get_client():
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYNTHESIZE_PROMPT = """You are a clinical diagnostic AI. A patient case was investigated by an autonomous agent.
Structure the findings into a clean clinical report.

Respond in {language}.

PATIENT CONTEXT:
{context}

INVESTIGATION FINDINGS:
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
  "tests_to_order": ["Test 1"],
  "specialists_to_consult": ["Specialist 1"],
  "hypotheses_to_rule_out": ["Condition 1"],
  "who_context": "Regional epidemiological context"
}}

Provide 3-5 ranked differentials. Be precise and evidence-based."""

def _clean_json(text: str) -> str:
    text = text.strip()
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.index("```", start)
        return text[start:end].strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        return "\n".join(lines).strip()
    return text

async def synthesize_report(context: str, pubmed_evidence: list, orphanet_data: list, who_context: str, language: str) -> dict:
    client = _get_client()
    prompt = SYNTHESIZE_PROMPT.format(
        context=context[:4000],
        who_context=who_context or "No specific regional data available.",
        language=language
    )
    response = client.models.generate_content(
        model="models/gemini-2.0-flash",
        contents=prompt,
    )
    return json.loads(_clean_json(response.text))
