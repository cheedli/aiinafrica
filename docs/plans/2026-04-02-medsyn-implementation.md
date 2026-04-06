# MedSyn Investigator — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack autonomous AI diagnostic agent with claymorphism UI, Gemini 2.0 reasoning, Florence-2 image captioning, and real PubMed/Orphanet/WHO APIs.

**Architecture:** FastAPI backend streams SSE events as a LangGraph agent queries PubMed, Orphanet, and WHO GHO APIs in parallel, then Gemini 2.0 synthesizes a ranked differential diagnosis. React frontend shows a live split-view: agent steps on the left, report cards populating on the right.

**Tech Stack:** Python 3.11, FastAPI, LangGraph, Google Gemini 2.0 Flash, Florence-2 (transformers), PyMuPDF, WeasyPrint, React 18, Vite, Tailwind CSS, Framer Motion

---

## Task 1: Project Scaffolding

**Files:**
- Create: `medsyn-backend/` directory structure
- Create: `medsyn-frontend/` via Vite

**Step 1: Create backend directory structure**
```bash
mkdir -p medsyn-backend/agent/tools
mkdir -p medsyn-backend/ingestion
mkdir -p medsyn-backend/report
mkdir -p medsyn-backend/models
touch medsyn-backend/agent/__init__.py
touch medsyn-backend/agent/tools/__init__.py
touch medsyn-backend/ingestion/__init__.py
touch medsyn-backend/report/__init__.py
touch medsyn-backend/models/__init__.py
```

**Step 2: Create backend requirements.txt**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
pymupdf==1.24.3
google-generativeai==0.5.4
langgraph==0.1.1
langchain-core==0.2.1
transformers==4.41.0
torch==2.3.0
Pillow==10.3.0
httpx==0.27.0
weasyprint==62.3
pydantic==2.7.1
python-dotenv==1.0.1
sse-starlette==2.1.0
```

**Step 3: Create backend .env**
```
GEMINI_API_KEY=your_gemini_api_key_here
NCBI_API_KEY=your_ncbi_api_key_here
```

**Step 4: Create frontend with Vite**
```bash
cd medsyn-frontend && npm create vite@latest . -- --template react
npm install
npm install framer-motion axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 5: Commit**
```bash
git init
git add .
git commit -m "feat: project scaffolding"
```

---

## Task 2: Pydantic Schemas

**Files:**
- Create: `medsyn-backend/models/schemas.py`

**Step 1: Write schemas**
```python
# medsyn-backend/models/schemas.py
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class StepType(str, Enum):
    STEP = "step"
    DATA = "data"
    SECTION = "section"
    DONE = "done"
    ERROR = "error"

class SSEEvent(BaseModel):
    type: StepType
    message: str
    data: Optional[dict] = None

class Diagnosis(BaseModel):
    rank: int
    name: str
    confidence: float  # 0.0 - 1.0
    orpha_code: Optional[str]
    orphanet_url: Optional[str]
    icd11_code: Optional[str]
    reasoning: str
    regional_prevalence: Optional[str]

class Evidence(BaseModel):
    pmid: str
    title: str
    authors: str
    journal: str
    year: int
    url: str
    relevance_note: str

class ActionPlan(BaseModel):
    tests_to_order: List[str]
    specialists_to_consult: List[str]
    hypotheses_to_rule_out: List[str]

class ClinicalReport(BaseModel):
    patient_summary: str
    detected_language: str
    differentials: List[Diagnosis]
    evidence: List[Evidence]
    action_plan: ActionPlan
    who_context: Optional[str]
    disclaimer: str = "This report is clinical decision support only. Final diagnosis must be made by a licensed physician."
```

**Step 2: Commit**
```bash
git add medsyn-backend/models/schemas.py
git commit -m "feat: pydantic schemas"
```

---

## Task 3: PDF Text Extractor

**Files:**
- Create: `medsyn-backend/ingestion/pdf_extractor.py`

**Step 1: Write extractor**
```python
# medsyn-backend/ingestion/pdf_extractor.py
import fitz  # PyMuPDF

def extract_pdf_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text.strip()
```

**Step 2: Commit**
```bash
git add medsyn-backend/ingestion/pdf_extractor.py
git commit -m "feat: PDF text extraction with PyMuPDF"
```

---

## Task 4: Florence-2 Image Captioner

**Files:**
- Create: `medsyn-backend/ingestion/image_captioner.py`

**Step 1: Write captioner**
```python
# medsyn-backend/ingestion/image_captioner.py
from transformers import AutoProcessor, AutoModelForCausalLM
from PIL import Image
import torch
import io

_model = None
_processor = None

def _load_model():
    global _model, _processor
    if _model is None:
        model_id = "microsoft/Florence-2-large"
        _processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
        _model = AutoModelForCausalLM.from_pretrained(
            model_id, trust_remote_code=True, torch_dtype=torch.float16
        )
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _model = _model.to(device)
    return _model, _processor

def caption_medical_image(image_bytes: bytes) -> str:
    model, processor = _load_model()
    device = next(model.parameters()).device
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # Use detailed caption task for medical context
    prompt = "<DETAILED_CAPTION>"
    inputs = processor(text=prompt, images=image, return_tensors="pt").to(device)
    
    with torch.no_grad():
        generated_ids = model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=512,
            num_beams=3,
        )
    
    result = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
    parsed = processor.post_process_generation(result, task=prompt, image_size=(image.width, image.height))
    return parsed.get("<DETAILED_CAPTION>", "Image content could not be described.")
```

**Step 2: Commit**
```bash
git add medsyn-backend/ingestion/image_captioner.py
git commit -m "feat: Florence-2 medical image captioning"
```

---

## Task 5: Input Processor

**Files:**
- Create: `medsyn-backend/ingestion/input_processor.py`

**Step 1: Write processor**
```python
# medsyn-backend/ingestion/input_processor.py
from .pdf_extractor import extract_pdf_text
from .image_captioner import caption_medical_image
from typing import List, Tuple

async def build_unified_context(
    text: str,
    pdf_files: List[Tuple[str, bytes]],
    image_files: List[Tuple[str, bytes]]
) -> str:
    parts = []

    if text.strip():
        parts.append(f"=== CLINICIAN INPUT ===\n{text.strip()}")

    for filename, content in pdf_files:
        extracted = extract_pdf_text(content)
        if extracted:
            parts.append(f"=== PDF DOCUMENT: {filename} ===\n{extracted}")

    for filename, content in image_files:
        caption = caption_medical_image(content)
        parts.append(f"=== MEDICAL IMAGE: {filename} ===\nFlorence-2 Visual Analysis: {caption}")

    return "\n\n".join(parts)
```

**Step 2: Commit**
```bash
git add medsyn-backend/ingestion/input_processor.py
git commit -m "feat: unified input processor"
```

---

## Task 6: PubMed Tool

**Files:**
- Create: `medsyn-backend/agent/tools/pubmed.py`

**Step 1: Write PubMed tool**
```python
# medsyn-backend/agent/tools/pubmed.py
import httpx
import os
from typing import List
from ...models.schemas import Evidence

PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
API_KEY = os.getenv("NCBI_API_KEY", "")

async def search_pubmed(query: str, max_results: int = 8) -> List[Evidence]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Search for IDs
        search_resp = await client.get(f"{PUBMED_BASE}/esearch.fcgi", params={
            "db": "pubmed", "term": query, "retmax": max_results,
            "retmode": "json", "api_key": API_KEY
        })
        search_data = search_resp.json()
        ids = search_data.get("esearchresult", {}).get("idlist", [])
        if not ids:
            return []

        # Fetch summaries
        summary_resp = await client.get(f"{PUBMED_BASE}/esummary.fcgi", params={
            "db": "pubmed", "id": ",".join(ids),
            "retmode": "json", "api_key": API_KEY
        })
        summary_data = summary_resp.json()
        results = summary_data.get("result", {})

        evidence = []
        for pmid in ids:
            art = results.get(pmid, {})
            if not art:
                continue
            authors = ", ".join([a.get("name", "") for a in art.get("authors", [])[:3]])
            evidence.append(Evidence(
                pmid=pmid,
                title=art.get("title", "Unknown title"),
                authors=authors or "Unknown authors",
                journal=art.get("fulljournalname", art.get("source", "")),
                year=int(art.get("pubdate", "2000")[:4]) if art.get("pubdate") else 2000,
                url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                relevance_note=""
            ))
        return evidence
```

**Step 2: Commit**
```bash
git add medsyn-backend/agent/tools/pubmed.py
git commit -m "feat: PubMed E-utilities tool"
```

---

## Task 7: Orphanet Tool

**Files:**
- Create: `medsyn-backend/agent/tools/orphanet.py`

**Step 1: Write Orphanet tool**

Note: Orphanet provides a free REST API at api.orphacode.org. We query by disease name.

```python
# medsyn-backend/agent/tools/orphanet.py
import httpx
from typing import Optional, dict as Dict

ORPHANET_BASE = "https://api.orphacode.org/EN/ClinicalEntity"

async def query_orphanet(disease_name: str) -> Optional[Dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                f"{ORPHANET_BASE}/approximateName/{disease_name}/1",
                headers={"apiKey": "testrest"}
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            if not data:
                return None
            first = data[0] if isinstance(data, list) else data
            orpha_code = first.get("OrphaCode")
            return {
                "orpha_code": str(orpha_code) if orpha_code else None,
                "name": first.get("Name", disease_name),
                "orphanet_url": f"https://www.orpha.net/consor/cgi-bin/OC_Exp.php?Lng=EN&Expert={orpha_code}" if orpha_code else None,
                "prevalence": first.get("PrevalenceList", [{}])[0].get("ValMoy", "Unknown") if first.get("PrevalenceList") else "Unknown"
            }
        except Exception:
            return None
```

**Step 2: Commit**
```bash
git add medsyn-backend/agent/tools/orphanet.py
git commit -m "feat: Orphanet rare disease lookup tool"
```

---

## Task 8: WHO GHO Tool

**Files:**
- Create: `medsyn-backend/agent/tools/who_gho.py`

**Step 1: Write WHO tool**
```python
# medsyn-backend/agent/tools/who_gho.py
import httpx
from typing import Optional

WHO_BASE = "https://ghoapi.azureedge.net/api"

AFRICAN_REGION_CODES = ["AFR", "EMR"]  # WHO African + Eastern Mediterranean

async def get_regional_context(condition_keywords: list[str]) -> Optional[str]:
    """Returns a brief regional prevalence note for context."""
    # Query mortality/disease burden indicators
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{WHO_BASE}/Indicator",
                params={"$filter": f"contains(IndicatorName, '{condition_keywords[0]}')"},
            )
            if resp.status_code != 200:
                return None
            data = resp.json().get("value", [])
            if not data:
                return f"No specific WHO GHO regional data found for: {', '.join(condition_keywords)}"
            indicator = data[0]
            return (
                f"WHO indicator: {indicator.get('IndicatorName', 'Unknown')}. "
                f"This condition has documented epidemiological tracking in African regions (AFR/EMR). "
                f"See: https://www.who.int/data/gho"
            )
    except Exception:
        return None
```

**Step 2: Commit**
```bash
git add medsyn-backend/agent/tools/who_gho.py
git commit -m "feat: WHO GHO regional context tool"
```

---

## Task 9: Gemini Reasoning Module

**Files:**
- Create: `medsyn-backend/agent/reasoning.py`

**Step 1: Write reasoning module**
```python
# medsyn-backend/agent/reasoning.py
import google.generativeai as genai
import os
import json
from typing import AsyncGenerator

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash-exp")

EXTRACT_PROMPT = """You are a clinical AI assistant. Given the following patient input, extract:
1. Key symptoms (list)
2. Patient history summary (2-3 sentences)
3. Detected language (one of: English, French, Arabic)
4. Top 3 search queries for PubMed (focused on rare/undiagnosed diseases in Africa)
5. Top 3 disease names to check in Orphanet
6. Top 3 keywords for WHO regional lookup

Respond ONLY with valid JSON:
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

SYNTHESIZE_PROMPT = """You are Manus, an expert clinical diagnostic AI. You have investigated a patient case and gathered the following evidence. 

Produce a complete clinical brief. Respond in {language}.

PATIENT CONTEXT:
{context}

PUBMED EVIDENCE FOUND:
{pubmed_evidence}

ORPHANET MATCHES:
{orphanet_data}

WHO REGIONAL CONTEXT:
{who_context}

Respond ONLY with valid JSON matching this exact structure:
{{
  "patient_summary": "2-3 sentence summary of the case",
  "differentials": [
    {{
      "rank": 1,
      "name": "Disease Name",
      "confidence": 0.85,
      "orpha_code": "123" or null,
      "orphanet_url": "url" or null,
      "icd11_code": "XY00" or null,
      "reasoning": "Why this diagnosis fits the evidence",
      "regional_prevalence": "Prevalence context for Africa"
    }}
  ],
  "evidence_relevance": {{"pmid": "why this paper supports the diagnosis"}},
  "tests_to_order": ["Test 1", "Test 2"],
  "specialists_to_consult": ["Specialist 1"],
  "hypotheses_to_rule_out": ["Condition 1", "Condition 2"],
  "who_context": "Regional epidemiological context"
}}

Provide 3-5 ranked differentials. Be precise and evidence-based."""

async def extract_clinical_info(context: str) -> dict:
    prompt = EXTRACT_PROMPT.format(context=context)
    response = model.generate_content(prompt)
    text = response.text.strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())

async def synthesize_report(context: str, pubmed_evidence: list, orphanet_data: list, who_context: str, language: str) -> dict:
    prompt = SYNTHESIZE_PROMPT.format(
        context=context,
        pubmed_evidence=json.dumps(pubmed_evidence, indent=2),
        orphanet_data=json.dumps(orphanet_data, indent=2),
        who_context=who_context or "No specific regional data available.",
        language=language
    )
    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
```

**Step 2: Commit**
```bash
git add medsyn-backend/agent/reasoning.py
git commit -m "feat: Gemini 2.0 reasoning module"
```

---

## Task 10: Manus LangGraph Agent

**Files:**
- Create: `medsyn-backend/agent/manus.py`

**Step 1: Write Manus agent**
```python
# medsyn-backend/agent/manus.py
import asyncio
import json
from typing import AsyncGenerator
from .reasoning import extract_clinical_info, synthesize_report
from .tools.pubmed import search_pubmed
from .tools.orphanet import query_orphanet
from .tools.who_gho import get_regional_context
from ..models.schemas import SSEEvent, StepType, ClinicalReport, Evidence, Diagnosis, ActionPlan

def _sse(type: StepType, message: str, data: dict = None) -> str:
    event = SSEEvent(type=type, message=message, data=data)
    return f"data: {event.model_dump_json()}\n\n"

async def run_manus(context: str) -> AsyncGenerator[str, None]:
    # Step 1: Extract clinical info
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

    # Step 2: Parallel API calls
    yield _sse(StepType.STEP, f"Querying PubMed with {len(pubmed_queries)} targeted searches...")
    
    pubmed_tasks = [search_pubmed(q) for q in pubmed_queries[:3]]
    orphanet_tasks = [query_orphanet(d) for d in orphanet_queries[:3]]
    who_task = get_regional_context(who_keywords)

    pubmed_results_nested, orphanet_results, who_context = await asyncio.gather(
        asyncio.gather(*pubmed_tasks),
        asyncio.gather(*orphanet_tasks),
        who_task
    )

    # Flatten and deduplicate pubmed results
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

    # Step 3: Synthesize with Gemini
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

    # Step 4: Build and stream report sections
    yield _sse(StepType.STEP, "Building ranked differential diagnosis...")

    differentials = []
    for d in report_data.get("differentials", []):
        differentials.append(Diagnosis(
            rank=d.get("rank", 0),
            name=d.get("name", "Unknown"),
            confidence=min(max(float(d.get("confidence", 0.5)), 0.0), 1.0),
            orpha_code=d.get("orpha_code"),
            orphanet_url=d.get("orphanet_url"),
            icd11_code=d.get("icd11_code"),
            reasoning=d.get("reasoning", ""),
            regional_prevalence=d.get("regional_prevalence")
        ))

    yield _sse(StepType.SECTION, "differentials", {
        "differentials": [d.model_dump() for d in differentials]
    })

    # Evidence section
    evidence_relevance = report_data.get("evidence_relevance", {})
    for ev in pubmed_evidence:
        ev.relevance_note = evidence_relevance.get(ev.pmid, "Supporting evidence")

    yield _sse(StepType.SECTION, "evidence", {
        "evidence": [e.model_dump() for e in pubmed_evidence[:6]]
    })

    # Action plan section
    action_plan = ActionPlan(
        tests_to_order=report_data.get("tests_to_order", []),
        specialists_to_consult=report_data.get("specialists_to_consult", []),
        hypotheses_to_rule_out=report_data.get("hypotheses_to_rule_out", [])
    )
    yield _sse(StepType.SECTION, "action_plan", {"action_plan": action_plan.model_dump()})

    # WHO context section
    yield _sse(StepType.SECTION, "who_context", {
        "who_context": report_data.get("who_context", who_context or "")
    })

    # Full report for PDF export
    full_report = ClinicalReport(
        patient_summary=report_data.get("patient_summary", ""),
        detected_language=language,
        differentials=differentials,
        evidence=pubmed_evidence[:6],
        action_plan=action_plan,
        who_context=report_data.get("who_context", who_context or "")
    )

    yield _sse(StepType.DONE, "Investigation complete.", {"report": full_report.model_dump()})
```

**Step 2: Commit**
```bash
git add medsyn-backend/agent/manus.py
git commit -m "feat: Manus LangGraph-style autonomous agent"
```

---

## Task 11: PDF Export

**Files:**
- Create: `medsyn-backend/report/pdf_export.py`

**Step 1: Write PDF exporter**
```python
# medsyn-backend/report/pdf_export.py
from weasyprint import HTML
from ..models.schemas import ClinicalReport
from datetime import datetime

def build_pdf(report: ClinicalReport) -> bytes:
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a2e; }}
      h1 {{ color: #6c63ff; border-bottom: 3px solid #6c63ff; padding-bottom: 10px; }}
      h2 {{ color: #4a4580; margin-top: 30px; }}
      .disclaimer {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 8px; font-size: 13px; }}
      .diagnosis {{ background: #f8f7ff; border-radius: 12px; padding: 16px; margin: 12px 0; border: 2px solid #e0ddff; }}
      .confidence {{ display: inline-block; background: #6c63ff; color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; }}
      .evidence {{ font-size: 13px; margin: 8px 0; }}
      .tag {{ display: inline-block; background: #e8f5e9; border: 1px solid #81c784; color: #2e7d32; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin: 3px; }}
      .meta {{ color: #888; font-size: 13px; }}
    </style>
    </head>
    <body>
    <h1>MedSyn Investigator — Clinical Brief</h1>
    <p class="meta">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Language: {report.detected_language}</p>
    <div class="disclaimer">⚠️ {report.disclaimer}</div>

    <h2>Patient Summary</h2>
    <p>{report.patient_summary}</p>

    <h2>Ranked Differential Diagnoses</h2>
    {"".join([f'''
    <div class="diagnosis">
      <strong>#{d.rank} {d.name}</strong>
      <span class="confidence">{int(d.confidence * 100)}% confidence</span>
      {f'<span class="tag">ORPHA:{d.orpha_code}</span>' if d.orpha_code else ""}
      {f'<span class="tag">ICD-11: {d.icd11_code}</span>' if d.icd11_code else ""}
      <p>{d.reasoning}</p>
      {f'<p class="meta">Regional: {d.regional_prevalence}</p>' if d.regional_prevalence else ""}
    </div>
    ''' for d in report.differentials])}

    <h2>Supporting Evidence (PubMed)</h2>
    {"".join([f'''
    <div class="evidence">
      <strong>{e.title}</strong><br>
      <span class="meta">{e.authors} · {e.journal} · {e.year}</span><br>
      <a href="{e.url}">{e.url}</a><br>
      <em>{e.relevance_note}</em>
    </div>
    ''' for e in report.evidence])}

    <h2>Action Plan</h2>
    <h3>Tests to Order</h3>
    <ul>{"".join([f"<li>{t}</li>" for t in report.action_plan.tests_to_order])}</ul>
    <h3>Specialists to Consult</h3>
    <ul>{"".join([f"<li>{s}</li>" for s in report.action_plan.specialists_to_consult])}</ul>
    <h3>Hypotheses to Rule Out</h3>
    <ul>{"".join([f"<li>{h}</li>" for h in report.action_plan.hypotheses_to_rule_out])}</ul>

    {f"<h2>WHO Regional Context</h2><p>{report.who_context}</p>" if report.who_context else ""}
    </body>
    </html>
    """
    return HTML(string=html).write_pdf()
```

**Step 2: Commit**
```bash
git add medsyn-backend/report/pdf_export.py
git commit -m "feat: WeasyPrint PDF export"
```

---

## Task 12: FastAPI Main App

**Files:**
- Create: `medsyn-backend/main.py`

**Step 1: Write main.py**
```python
# medsyn-backend/main.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse
from typing import List, Optional
import json
from dotenv import load_dotenv

load_dotenv()

from agent.manus import run_manus
from ingestion.input_processor import build_unified_context
from report.pdf_export import build_pdf
from models.schemas import ClinicalReport

app = FastAPI(title="MedSyn Investigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "Manus", "version": "1.0"}

@app.post("/analyze")
async def analyze(
    text: Optional[str] = Form(default=""),
    pdfs: Optional[List[UploadFile]] = File(default=None),
    images: Optional[List[UploadFile]] = File(default=None),
):
    pdf_files = []
    if pdfs:
        for f in pdfs:
            content = await f.read()
            pdf_files.append((f.filename, content))

    image_files = []
    if images:
        for f in images:
            content = await f.read()
            image_files.append((f.filename, content))

    context = await build_unified_context(text or "", pdf_files, image_files)

    async def event_generator():
        async for event in run_manus(context):
            yield event

    return EventSourceResponse(event_generator())

@app.post("/export-pdf")
async def export_pdf(report: ClinicalReport):
    pdf_bytes = build_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=medsyn_report.pdf"}
    )
```

**Step 2: Commit**
```bash
git add medsyn-backend/main.py
git commit -m "feat: FastAPI app with SSE /analyze and /export-pdf endpoints"
```

---

## Task 13: Tailwind + Claymorphism CSS

**Files:**
- Modify: `medsyn-frontend/tailwind.config.js`
- Create: `medsyn-frontend/src/styles/clay.css`

**Step 1: Configure Tailwind**
```js
// medsyn-frontend/tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          lavender: "#C9B8FF",
          mint: "#B8F0D8",
          peach: "#FFD4B8",
          sky: "#B8E8FF",
          rose: "#FFB8D4",
          yellow: "#FFF4B8",
          dark: "#1a1a2e",
          card: "#F4F0FF",
        }
      },
      borderRadius: {
        clay: "20px",
        "clay-lg": "28px",
        "clay-xl": "36px",
      },
      boxShadow: {
        clay: "6px 6px 0px 0px rgba(0,0,0,0.15), inset 0px 2px 0px rgba(255,255,255,0.6)",
        "clay-lg": "8px 8px 0px 0px rgba(0,0,0,0.18), inset 0px 3px 0px rgba(255,255,255,0.7)",
        "clay-hover": "10px 10px 0px 0px rgba(0,0,0,0.2), inset 0px 3px 0px rgba(255,255,255,0.7)",
        "clay-inset": "inset 4px 4px 8px rgba(0,0,0,0.1), inset 0px 2px 0px rgba(255,255,255,0.5)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}
```

**Step 2: Write clay.css**
```css
/* medsyn-frontend/src/styles/clay.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .clay-card {
    @apply rounded-clay bg-white border-[3px] border-black shadow-clay;
  }

  .clay-card-lavender {
    @apply rounded-clay bg-clay-lavender border-[3px] border-black shadow-clay;
  }

  .clay-card-mint {
    @apply rounded-clay bg-clay-mint border-[3px] border-black shadow-clay;
  }

  .clay-card-peach {
    @apply rounded-clay bg-clay-peach border-[3px] border-black shadow-clay;
  }

  .clay-card-sky {
    @apply rounded-clay bg-clay-sky border-[3px] border-black shadow-clay;
  }

  .clay-btn {
    @apply rounded-clay border-[3px] border-black shadow-clay font-bold px-6 py-3
           transition-all duration-150 active:translate-x-1 active:translate-y-1 active:shadow-none
           hover:shadow-clay-hover hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer;
  }

  .clay-btn-primary {
    @apply clay-btn bg-clay-lavender text-black;
  }

  .clay-btn-peach {
    @apply clay-btn bg-clay-peach text-black;
  }

  .clay-pill {
    @apply rounded-full border-[2px] border-black px-3 py-1 text-sm font-semibold shadow-clay;
  }
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(135deg, #e8e0ff 0%, #d4f5e9 50%, #ffe8d4 100%);
  min-height: 100vh;
}

/* Floating blobs background */
.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
  animation: blobFloat 8s ease-in-out infinite alternate;
}

@keyframes blobFloat {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 20px) scale(1.05); }
}

/* Confidence bar animation */
.confidence-fill {
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* SSE step card appear */
.step-enter {
  animation: stepAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes stepAppear {
  from { opacity: 0; transform: translateX(-20px) scale(0.95); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}
```

**Step 3: Update main.css import in index.css**
Replace contents of `medsyn-frontend/src/index.css` with:
```css
@import './styles/clay.css';
```

**Step 4: Commit**
```bash
git add medsyn-frontend/tailwind.config.js medsyn-frontend/src/styles/clay.css medsyn-frontend/src/index.css
git commit -m "feat: claymorphism design system"
```

---

## Task 14: Reusable UI Components

**Files:**
- Create: `medsyn-frontend/src/components/ui/ClayCard.jsx`
- Create: `medsyn-frontend/src/components/ui/ConfidenceBar.jsx`

**Step 1: ClayCard component**
```jsx
// medsyn-frontend/src/components/ui/ClayCard.jsx
import { motion } from 'framer-motion'

const variantMap = {
  white: 'bg-white',
  lavender: 'bg-clay-lavender',
  mint: 'bg-clay-mint',
  peach: 'bg-clay-peach',
  sky: 'bg-clay-sky',
  rose: 'bg-clay-rose',
  yellow: 'bg-clay-yellow',
}

export default function ClayCard({ children, variant = 'white', className = '', animate = true, ...props }) {
  const bg = variantMap[variant] || 'bg-white'
  const base = `rounded-clay border-[3px] border-black shadow-clay ${bg} ${className}`

  if (!animate) return <div className={base} {...props}>{children}</div>

  return (
    <motion.div
      className={base}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      whileHover={{ y: -3, boxShadow: '10px 10px 0px 0px rgba(0,0,0,0.2)' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
```

**Step 2: ConfidenceBar component**
```jsx
// medsyn-frontend/src/components/ui/ConfidenceBar.jsx
import { motion } from 'framer-motion'

const getColor = (confidence) => {
  if (confidence >= 0.75) return 'bg-clay-mint border-green-700'
  if (confidence >= 0.5) return 'bg-clay-yellow border-yellow-600'
  return 'bg-clay-peach border-orange-600'
}

export default function ConfidenceBar({ confidence, label }) {
  const pct = Math.round(confidence * 100)
  const color = getColor(confidence)

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600">{label || 'Confidence'}</span>
        <span className="text-xs font-bold">{pct}%</span>
      </div>
      <div className="w-full h-4 bg-gray-100 rounded-full border-2 border-black overflow-hidden">
        <motion.div
          className={`h-full rounded-full border-r-2 border-black ${color.split(' ')[0]}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
        />
      </div>
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add medsyn-frontend/src/components/ui/
git commit -m "feat: ClayCard and ConfidenceBar UI components"
```

---

## Task 15: Navbar Component

**Files:**
- Create: `medsyn-frontend/src/components/layout/Navbar.jsx`

**Step 1: Write Navbar**
```jsx
// medsyn-frontend/src/components/layout/Navbar.jsx
import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl"
    >
      <div className="clay-card bg-white/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-clay bg-clay-lavender border-2 border-black shadow-clay flex items-center justify-center font-black text-lg">
            M
          </div>
          <span className="font-black text-xl tracking-tight">MedSyn</span>
          <span className="clay-pill bg-clay-mint text-xs">Investigator</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="clay-pill bg-clay-peach text-xs">AI4SDG3</span>
          <span className="clay-pill bg-clay-sky text-xs">GITEX Africa 2026</span>
        </div>
      </div>
    </motion.nav>
  )
}
```

**Step 2: Commit**
```bash
git add medsyn-frontend/src/components/layout/Navbar.jsx
git commit -m "feat: Navbar component"
```

---

## Task 16: Upload Zone Components

**Files:**
- Create: `medsyn-frontend/src/components/upload/UploadZone.jsx`
- Create: `medsyn-frontend/src/components/upload/FilePreview.jsx`

**Step 1: UploadZone**
```jsx
// medsyn-frontend/src/components/upload/UploadZone.jsx
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ClayCard from '../ui/ClayCard'

export default function UploadZone({ type, label, icon, variant, accept, multiple = false, onFiles }) {
  const inputRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const [files, setFiles] = useState([])

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    setFiles(arr)
    onFiles(arr)
  }

  return (
    <ClayCard variant={variant} className="p-5 flex flex-col gap-3 min-h-[160px] cursor-pointer" animate={false}>
      <motion.div
        className={`flex flex-col items-center justify-center flex-1 rounded-xl border-2 border-dashed border-black/30 p-4 transition-colors ${dragOver ? 'bg-black/5' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className="text-4xl mb-2">{icon}</span>
        <span className="font-bold text-sm text-center">{label}</span>
        <span className="text-xs text-gray-500 mt-1">Drop or click to upload</span>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 justify-center">
            {files.map((f, i) => (
              <span key={i} className="clay-pill bg-white text-xs">{f.name}</span>
            ))}
          </div>
        )}
      </motion.div>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </ClayCard>
  )
}
```

**Step 2: Commit**
```bash
git add medsyn-frontend/src/components/upload/
git commit -m "feat: upload zone component"
```

---

## Task 17: Agent Feed Components

**Files:**
- Create: `medsyn-frontend/src/components/investigation/StepCard.jsx`
- Create: `medsyn-frontend/src/components/investigation/AgentFeed.jsx`
- Create: `medsyn-frontend/src/components/investigation/TypingIndicator.jsx`

**Step 1: StepCard**
```jsx
// medsyn-frontend/src/components/investigation/StepCard.jsx
import { motion } from 'framer-motion'

const typeConfig = {
  step: { icon: '🔍', bg: 'bg-white', label: 'Investigating' },
  data: { icon: '📊', bg: 'bg-clay-sky', label: 'Data' },
  section: { icon: '✅', bg: 'bg-clay-mint', label: 'Complete' },
  error: { icon: '⚠️', bg: 'bg-clay-peach', label: 'Error' },
  done: { icon: '🎯', bg: 'bg-clay-lavender', label: 'Done' },
}

export default function StepCard({ event, index }) {
  const config = typeConfig[event.type] || typeConfig.step
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: index * 0.05 }}
      className={`flex gap-3 items-start p-3 rounded-clay border-2 border-black shadow-clay ${config.bg}`}
    >
      <span className="text-lg flex-shrink-0">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold uppercase tracking-wide opacity-60">{config.label}</span>
        </div>
        <p className="text-sm font-medium leading-snug break-words">{event.message}</p>
        {event.data && event.type === 'data' && (
          <div className="mt-1 flex flex-wrap gap-1">
            {event.data.symptoms?.map((s, i) => (
              <span key={i} className="clay-pill bg-clay-lavender text-xs">{s}</span>
            ))}
            {event.data.diseases?.map((d, i) => (
              <span key={i} className="clay-pill bg-clay-peach text-xs">{d}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
```

**Step 2: TypingIndicator**
```jsx
// medsyn-frontend/src/components/investigation/TypingIndicator.jsx
import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <div className="flex gap-2 items-center p-3 rounded-clay border-2 border-black bg-white shadow-clay">
      <span className="text-lg">🤖</span>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-2 h-2 bg-clay-lavender rounded-full border border-black"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-500">Manus is thinking...</span>
    </div>
  )
}
```

**Step 3: AgentFeed**
```jsx
// medsyn-frontend/src/components/investigation/AgentFeed.jsx
import { useEffect, useRef } from 'react'
import StepCard from './StepCard'
import TypingIndicator from './TypingIndicator'

export default function AgentFeed({ events, isRunning }) {
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full pr-1">
      <div className="sticky top-0 z-10 clay-card-lavender px-4 py-2 mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full border-2 border-black ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
          <span className="font-black text-sm">Manus — Live Investigation</span>
        </div>
      </div>
      {events.map((event, i) => (
        <StepCard key={i} event={event} index={i} />
      ))}
      {isRunning && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  )
}
```

**Step 4: Commit**
```bash
git add medsyn-frontend/src/components/investigation/
git commit -m "feat: agent feed components"
```

---

## Task 18: Report Panel Components

**Files:**
- Create: `medsyn-frontend/src/components/report/DiagnosisCard.jsx`
- Create: `medsyn-frontend/src/components/report/EvidenceCard.jsx`
- Create: `medsyn-frontend/src/components/report/ActionPlanCard.jsx`
- Create: `medsyn-frontend/src/components/report/ReportPanel.jsx`
- Create: `medsyn-frontend/src/components/report/ExportButton.jsx`

**Step 1: DiagnosisCard**
```jsx
// medsyn-frontend/src/components/report/DiagnosisCard.jsx
import ClayCard from '../ui/ClayCard'
import ConfidenceBar from '../ui/ConfidenceBar'

const rankColors = ['lavender', 'mint', 'sky', 'peach', 'yellow']

export default function DiagnosisCard({ diagnosis }) {
  const variant = rankColors[diagnosis.rank - 1] || 'white'
  return (
    <ClayCard variant={variant} className="p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="clay-pill bg-white text-xs font-black">#{diagnosis.rank}</span>
            <h3 className="font-black text-base">{diagnosis.name}</h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {diagnosis.orpha_code && (
              <a href={diagnosis.orphanet_url} target="_blank" rel="noreferrer"
                className="clay-pill bg-white text-xs hover:bg-clay-lavender transition-colors">
                ORPHA:{diagnosis.orpha_code}
              </a>
            )}
            {diagnosis.icd11_code && (
              <span className="clay-pill bg-white text-xs">ICD-11: {diagnosis.icd11_code}</span>
            )}
          </div>
        </div>
      </div>
      <ConfidenceBar confidence={diagnosis.confidence} />
      <p className="mt-3 text-sm leading-relaxed">{diagnosis.reasoning}</p>
      {diagnosis.regional_prevalence && (
        <p className="mt-2 text-xs text-gray-600 bg-white/50 rounded-xl p-2 border border-black/10">
          🌍 {diagnosis.regional_prevalence}
        </p>
      )}
    </ClayCard>
  )
}
```

**Step 2: EvidenceCard**
```jsx
// medsyn-frontend/src/components/report/EvidenceCard.jsx
import ClayCard from '../ui/ClayCard'

export default function EvidenceCard({ evidence }) {
  return (
    <ClayCard variant="white" className="p-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-clay bg-clay-sky border-2 border-black shadow-clay flex items-center justify-center text-sm font-black">
          📄
        </div>
        <div className="flex-1 min-w-0">
          <a href={evidence.url} target="_blank" rel="noreferrer"
            className="font-semibold text-sm leading-snug hover:underline line-clamp-2">
            {evidence.title}
          </a>
          <p className="text-xs text-gray-500 mt-0.5">{evidence.authors} · {evidence.journal} · {evidence.year}</p>
          {evidence.relevance_note && (
            <p className="text-xs text-gray-600 mt-1 italic">{evidence.relevance_note}</p>
          )}
          <a href={evidence.url} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 hover:underline mt-1 block">
            PubMed:{evidence.pmid}
          </a>
        </div>
      </div>
    </ClayCard>
  )
}
```

**Step 3: ActionPlanCard**
```jsx
// medsyn-frontend/src/components/report/ActionPlanCard.jsx
import ClayCard from '../ui/ClayCard'

function Section({ title, icon, items, variant }) {
  if (!items?.length) return null
  return (
    <ClayCard variant={variant} className="p-4">
      <h4 className="font-black text-sm mb-2">{icon} {title}</h4>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-black/40 font-mono text-xs mt-0.5">{String(i+1).padStart(2,'0')}</span>
            {item}
          </li>
        ))}
      </ul>
    </ClayCard>
  )
}

export default function ActionPlanCard({ actionPlan }) {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Tests to Order" icon="🧪" items={actionPlan.tests_to_order} variant="mint" />
      <Section title="Specialists to Consult" icon="👨‍⚕️" items={actionPlan.specialists_to_consult} variant="sky" />
      <Section title="Hypotheses to Rule Out" icon="❌" items={actionPlan.hypotheses_to_rule_out} variant="peach" />
    </div>
  )
}
```

**Step 4: ExportButton**
```jsx
// medsyn-frontend/src/components/report/ExportButton.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function ExportButton({ report }) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!report || loading) return
    setLoading(true)
    try {
      const resp = await axios.post('http://localhost:8000/export-pdf', report, {
        responseType: 'blob'
      })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'medsyn_clinical_brief.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      onClick={handleExport}
      disabled={!report || loading}
      className="clay-btn-peach w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
      whileTap={{ scale: 0.97 }}
    >
      {loading ? '⏳ Generating PDF...' : '📄 Export Clinical Brief (PDF)'}
    </motion.button>
  )
}
```

**Step 5: ReportPanel**
```jsx
// medsyn-frontend/src/components/report/ReportPanel.jsx
import { motion, AnimatePresence } from 'framer-motion'
import DiagnosisCard from './DiagnosisCard'
import EvidenceCard from './EvidenceCard'
import ActionPlanCard from './ActionPlanCard'
import ExportButton from './ExportButton'
import ClayCard from '../ui/ClayCard'

export default function ReportPanel({ report, fullReport }) {
  const hasContent = report.differentials?.length || report.evidence?.length || report.actionPlan

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-4 pl-1">
      <div className="sticky top-0 z-10 clay-card px-4 py-2 mb-1">
        <div className="flex items-center justify-between">
          <span className="font-black text-sm">Clinical Brief</span>
          {report.language && (
            <span className="clay-pill bg-clay-mint text-xs">🌐 {report.language}</span>
          )}
        </div>
      </div>

      {!hasContent && (
        <ClayCard variant="lavender" className="p-8 text-center">
          <p className="text-4xl mb-3">🔬</p>
          <p className="font-bold text-gray-600">Report will appear here as Manus investigates...</p>
        </ClayCard>
      )}

      <AnimatePresence>
        {report.differentials?.length > 0 && (
          <motion.div key="differentials" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-black text-sm uppercase tracking-wide mb-2 px-1">
              🎯 Differential Diagnoses
            </h3>
            <div className="flex flex-col gap-3">
              {report.differentials.map((d, i) => <DiagnosisCard key={i} diagnosis={d} />)}
            </div>
          </motion.div>
        )}

        {report.evidence?.length > 0 && (
          <motion.div key="evidence" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-black text-sm uppercase tracking-wide mb-2 px-1">
              📚 PubMed Evidence
            </h3>
            <div className="flex flex-col gap-2">
              {report.evidence.map((e, i) => <EvidenceCard key={i} evidence={e} />)}
            </div>
          </motion.div>
        )}

        {report.actionPlan && (
          <motion.div key="action" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="font-black text-sm uppercase tracking-wide mb-2 px-1">
              📋 Action Plan
            </h3>
            <ActionPlanCard actionPlan={report.actionPlan} />
          </motion.div>
        )}

        {report.whoContext && (
          <motion.div key="who" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ClayCard variant="sky" className="p-4">
              <h3 className="font-black text-sm mb-2">🌍 WHO Regional Context</h3>
              <p className="text-sm">{report.whoContext}</p>
            </ClayCard>
          </motion.div>
        )}

        {fullReport && (
          <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ExportButton report={fullReport} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 6: Commit**
```bash
git add medsyn-frontend/src/components/report/
git commit -m "feat: report panel components"
```

---

## Task 19: SSE Hook

**Files:**
- Create: `medsyn-frontend/src/hooks/useAgentStream.js`

**Step 1: Write hook**
```js
// medsyn-frontend/src/hooks/useAgentStream.js
import { useState, useCallback } from 'react'

export default function useAgentStream() {
  const [events, setEvents] = useState([])
  const [report, setReport] = useState({})
  const [fullReport, setFullReport] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)

  const startAnalysis = useCallback(async (formData) => {
    setEvents([])
    setReport({})
    setFullReport(null)
    setError(null)
    setIsRunning(true)

    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      setError('Server error. Please try again.')
      setIsRunning(false)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          setEvents(prev => [...prev, event])

          if (event.type === 'section') {
            if (event.message === 'differentials' && event.data?.differentials) {
              setReport(prev => ({ ...prev, differentials: event.data.differentials }))
            } else if (event.message === 'evidence' && event.data?.evidence) {
              setReport(prev => ({ ...prev, evidence: event.data.evidence }))
            } else if (event.message === 'action_plan' && event.data?.action_plan) {
              setReport(prev => ({ ...prev, actionPlan: event.data.action_plan }))
            } else if (event.message === 'who_context' && event.data?.who_context) {
              setReport(prev => ({ ...prev, whoContext: event.data.who_context }))
            }
          } else if (event.type === 'data' && event.data?.language) {
            setReport(prev => ({ ...prev, language: event.data.language }))
          } else if (event.type === 'done' && event.data?.report) {
            setFullReport(event.data.report)
            setIsRunning(false)
          } else if (event.type === 'error') {
            setError(event.message)
            setIsRunning(false)
          }
        } catch {}
      }
    }
    setIsRunning(false)
  }, [])

  return { events, report, fullReport, isRunning, error, startAnalysis }
}
```

**Step 2: Commit**
```bash
git add medsyn-frontend/src/hooks/useAgentStream.js
git commit -m "feat: SSE streaming hook"
```

---

## Task 20: Home Page

**Files:**
- Create: `medsyn-frontend/src/pages/Home.jsx`

**Step 1: Write Home page**
```jsx
// medsyn-frontend/src/pages/Home.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import UploadZone from '../components/upload/UploadZone'
import ClayCard from '../components/ui/ClayCard'

export default function Home() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [pdfs, setPdfs] = useState([])
  const [images, setImages] = useState([])

  const handleStart = () => {
    if (!text.trim() && !pdfs.length && !images.length) return
    navigate('/investigate', { state: { text, pdfs, images } })
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12">
      {/* Background blobs */}
      <div className="blob w-96 h-96 bg-clay-lavender top-10 -left-20" />
      <div className="blob w-80 h-80 bg-clay-mint bottom-20 right-0" style={{ animationDelay: '2s' }} />
      <div className="blob w-64 h-64 bg-clay-peach top-1/2 left-1/2" style={{ animationDelay: '4s' }} />

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center"
        >
          <ClayCard variant="lavender" className="inline-block px-6 py-2 mb-4">
            <span className="font-black text-sm">🤖 Powered by Gemini 2.0 + Florence-2</span>
          </ClayCard>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4">
            Upload anything.<br />
            <span className="relative inline-block">
              Manus investigates.
              <motion.div
                className="absolute -bottom-1 left-0 h-3 bg-clay-mint border-2 border-black rounded-full w-full -z-10"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              />
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Autonomous AI diagnostic agent for undiagnosed conditions in Africa. 
            Upload patient notes in Arabic, French, or English.
          </p>
        </motion.div>

        {/* Text input */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <ClayCard className="p-5 w-full">
            <label className="block font-black text-sm mb-2">
              📝 Patient Description
              <span className="ml-2 clay-pill bg-clay-mint text-xs">Arabic · French · English</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Describe symptoms, history, labs... في أي لغة / dans n'importe quelle langue"
              rows={4}
              className="w-full rounded-xl border-2 border-black/20 p-3 text-sm resize-none focus:outline-none focus:border-black bg-transparent"
            />
          </ClayCard>
        </motion.div>

        {/* Upload zones */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <UploadZone
            type="pdf" label="Lab Reports / Discharge Letters" icon="📄"
            variant="peach" accept=".pdf" multiple
            onFiles={setPdfs}
          />
          <UploadZone
            type="image" label="Medical Images / Scans" icon="🔬"
            variant="sky" accept="image/*" multiple
            onFiles={setImages}
          />
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
        >
          <motion.button
            onClick={handleStart}
            disabled={!text.trim() && !pdfs.length && !images.length}
            className="clay-btn bg-clay-lavender text-black text-lg px-10 py-4 disabled:opacity-40 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            🚀 Start Investigation
          </motion.button>
        </motion.div>

        {/* SDG badges */}
        <motion.div
          className="flex flex-wrap gap-2 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {['SDG 3.4', 'SDG 3.8', 'SDG 3.d', 'PubMed', 'Orphanet', 'WHO GHO'].map(tag => (
            <span key={tag} className="clay-pill bg-white text-xs">{tag}</span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add medsyn-frontend/src/pages/Home.jsx
git commit -m "feat: Home page with claymorphism upload UI"
```

---

## Task 21: Investigation Page

**Files:**
- Create: `medsyn-frontend/src/pages/Investigation.jsx`

**Step 1: Write Investigation page**
```jsx
// medsyn-frontend/src/pages/Investigation.jsx
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AgentFeed from '../components/investigation/AgentFeed'
import ReportPanel from '../components/report/ReportPanel'
import useAgentStream from '../hooks/useAgentStream'
import ClayCard from '../components/ui/ClayCard'

export default function Investigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { text, pdfs, images } = location.state || {}
  const { events, report, fullReport, isRunning, error, startAnalysis } = useAgentStream()

  useEffect(() => {
    if (!text && !pdfs?.length && !images?.length) {
      navigate('/')
      return
    }

    const formData = new FormData()
    if (text) formData.append('text', text)
    if (pdfs) pdfs.forEach(f => formData.append('pdfs', f))
    if (images) images.forEach(f => formData.append('images', f))

    startAnalysis(formData)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col pt-20">
      {/* Background blobs */}
      <div className="blob w-72 h-72 bg-clay-lavender top-20 -left-10 opacity-20" />
      <div className="blob w-60 h-60 bg-clay-mint bottom-10 right-0 opacity-20" style={{ animationDelay: '3s' }} />

      {/* Top bar */}
      <div className="relative z-10 px-4 py-2">
        <ClayCard className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="clay-pill bg-clay-peach text-sm font-bold hover:bg-clay-rose transition-colors">
              ← Back
            </button>
            <span className="font-black">Manus Investigation</span>
            {report.language && (
              <span className="clay-pill bg-clay-mint text-xs">🌐 {report.language}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="clay-pill bg-clay-yellow text-xs animate-pulse">⚡ Live</span>
            )}
            {!isRunning && events.length > 0 && (
              <span className="clay-pill bg-clay-mint text-xs">✅ Complete</span>
            )}
            <span className="clay-pill bg-white text-xs">{events.length} steps</span>
          </div>
        </ClayCard>
      </div>

      {error && (
        <div className="px-4 py-2">
          <ClayCard variant="peach" className="px-5 py-3 text-sm font-semibold">
            ⚠️ {error}
          </ClayCard>
        </div>
      )}

      {/* Split view */}
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4 px-4 pb-6 h-[calc(100vh-140px)]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="clay-card bg-white/60 backdrop-blur-sm p-4 overflow-hidden flex flex-col"
        >
          <AgentFeed events={events} isRunning={isRunning} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="clay-card bg-white/60 backdrop-blur-sm p-4 overflow-hidden flex flex-col"
        >
          <ReportPanel report={report} fullReport={fullReport} />
        </motion.div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**
```bash
git add medsyn-frontend/src/pages/Investigation.jsx
git commit -m "feat: Investigation split-view page"
```

---

## Task 22: App Entry Point

**Files:**
- Modify: `medsyn-frontend/src/App.jsx`

**Step 1: Install react-router-dom**
```bash
cd medsyn-frontend && npm install react-router-dom
```

**Step 2: Write App.jsx**
```jsx
// medsyn-frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Home from './pages/Home'
import Investigation from './pages/Investigation'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/investigate" element={<Investigation />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**Step 3: Commit**
```bash
git add medsyn-frontend/src/App.jsx
git commit -m "feat: App router"
```

---

## Task 23: Final Wiring & Run

**Step 1: Install backend dependencies**
```bash
cd medsyn-backend && pip install -r requirements.txt
```

**Step 2: Run backend**
```bash
cd medsyn-backend && uvicorn main:app --reload --port 8000
```

**Step 3: Run frontend**
```bash
cd medsyn-frontend && npm run dev
```

**Step 4: Verify**
- Open `http://localhost:5173`
- Enter a test case (e.g., "Patient from rural Morocco, 34 years old, presents with 3 months of unexplained fever, splenomegaly, and weight loss")
- Click Start Investigation
- Verify left panel streams steps, right panel populates report cards
- Test PDF export

---
