from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import os
import json
import httpx
from google import genai

load_dotenv()

from agent.manus import run_manus, _headers, MANUS_BASE
from ingestion.input_processor import build_unified_context
from report.pdf_export import build_pdf
from models.schemas import ClinicalReport
from db import (
    init_db, save_investigation, get_all_investigations, get_investigation, get_stats,
    create_patient, update_patient, get_all_patients, get_patient, delete_patient,
    save_message, get_messages, save_document, get_documents,
    save_benchmark_result, get_benchmark_results, delete_benchmark_result, clear_benchmark_results
)
from rag.embedder import ingest_document, embed_query
from rag.vectorstore import query as rag_query, delete_patient_docs, get_all_patient_chunks

app = FastAPI(title="MedSyn Investigator API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_db()

_active_task_id: Optional[str] = None

async def _stop_active_task():
    global _active_task_id
    if _active_task_id:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(f"{MANUS_BASE}/task.stop", headers=_headers(), json={"task_id": _active_task_id})
        except Exception:
            pass
        _active_task_id = None

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "Manus", "version": "1.0"}

# ── Analyze ───────────────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze(
    text: Optional[str] = Form(default=""),
    pdfs: Optional[List[UploadFile]] = File(default=None),
    images: Optional[List[UploadFile]] = File(default=None),
):
    global _active_task_id
    await _stop_active_task()

    pdf_files = []
    if pdfs:
        for f in pdfs:
            if f.filename:
                content = await f.read()
                pdf_files.append((f.filename, content))

    image_files = []
    if images:
        for f in images:
            if f.filename:
                content = await f.read()
                image_files.append((f.filename, content))

    context = await build_unified_context(text or "", pdf_files, image_files)

    async def event_generator():
        global _active_task_id
        async for chunk in run_manus(context):
            if '"task_id"' in chunk and _active_task_id is None:
                try:
                    data = json.loads(chunk.replace('data: ', '').strip())
                    tid = data.get('data', {}).get('task_id')
                    if tid:
                        _active_task_id = tid
                except Exception:
                    pass
            if '"done"' in chunk:
                try:
                    data = json.loads(chunk.replace('data: ', '').strip())
                    report = data.get('data', {}).get('report')
                    if report:
                        await save_investigation(report)
                except Exception:
                    pass
            yield chunk
        _active_task_id = None

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}
    )

# ── Investigations history ────────────────────────────────────────────────────

@app.get("/history")
async def history(limit: int = 50):
    rows = await get_all_investigations(limit)
    for r in rows:
        if isinstance(r.get("differentials"), str):
            try:
                r["differentials"] = json.loads(r["differentials"])
            except Exception:
                r["differentials"] = []
    return {"investigations": rows}

@app.get("/history/{id}")
async def history_detail(id: int):
    row = await get_investigation(id)
    if not row:
        return Response(status_code=404)
    return row

@app.get("/stats")
async def stats():
    return await get_stats()

# ── PDF export ────────────────────────────────────────────────────────────────

@app.post("/export-pdf")
async def export_pdf(report: ClinicalReport):
    pdf_bytes = build_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=medsyn_report.pdf"}
    )

# ── Patients CRUD ─────────────────────────────────────────────────────────────

class PatientIn(BaseModel):
    first_name: str
    last_name: str
    age: Optional[int] = None
    sex: Optional[str] = ""
    country: Optional[str] = ""
    region: Optional[str] = ""
    chief_complaint: Optional[str] = ""
    history: Optional[str] = ""
    medications: Optional[str] = ""
    allergies: Optional[str] = ""
    lab_results: Optional[str] = ""
    notes: Optional[str] = ""
    blood_type: Optional[str] = ""
    patient_id: Optional[str] = ""

@app.get("/patients")
async def list_patients():
    return {"patients": await get_all_patients()}

@app.post("/patients")
async def add_patient(p: PatientIn):
    id = await create_patient(p.model_dump())
    patient = await get_patient(id)
    return patient

@app.get("/patients/{id}")
async def get_patient_route(id: int):
    p = await get_patient(id)
    if not p:
        return Response(status_code=404)
    p["messages"] = await get_messages(id)
    return p

@app.put("/patients/{id}")
async def update_patient_route(id: int, p: PatientIn):
    await update_patient(id, p.model_dump())
    return await get_patient(id)

@app.delete("/patients/{id}")
async def delete_patient_route(id: int):
    delete_patient_docs(id)
    await delete_patient(id)
    return {"ok": True}

# ── Document upload + RAG ingestion ──────────────────────────────────────────

@app.post("/patients/{id}/documents")
async def upload_document(
    id: int,
    files: List[UploadFile] = File(...),
):
    patient = await get_patient(id)
    if not patient:
        return Response(status_code=404)

    results = []
    for file in files:
        content = await file.read()
        result = await ingest_document(
            patient_id=id,
            filename=file.filename,
            content=content,
        )
        await save_document(
            patient_id=id,
            filename=result["filename"],
            source_type=result["source_type"],
            chunks=result["chunks"],
            preview=result["preview"],
        )
        results.append(result)

    return {"ingested": results}

@app.get("/patients/{id}/documents")
async def list_documents(id: int):
    return {"documents": await get_documents(id)}

# ── Patient AI chat ───────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str

def _build_patient_context(patient: dict) -> str:
    parts = []
    name = f"{patient.get('first_name','')} {patient.get('last_name','')}".strip()
    if name: parts.append(f"Patient: {name}")
    if patient.get("age"): parts.append(f"Age: {patient['age']}")
    if patient.get("sex"): parts.append(f"Sex: {patient['sex']}")
    if patient.get("country"): parts.append(f"Country: {patient['country']}")
    if patient.get("region"): parts.append(f"Region: {patient['region']}")
    if patient.get("chief_complaint"): parts.append(f"Chief complaint: {patient['chief_complaint']}")
    if patient.get("history"): parts.append(f"Medical history: {patient['history']}")
    if patient.get("medications"): parts.append(f"Medications: {patient['medications']}")
    if patient.get("allergies"): parts.append(f"Allergies: {patient['allergies']}")
    if patient.get("lab_results"): parts.append(f"Lab results: {patient['lab_results']}")
    if patient.get("notes"): parts.append(f"Notes: {patient['notes']}")
    return "\n".join(parts)

@app.post("/patients/{id}/chat")
async def patient_chat(id: int, body: ChatMessage):
    patient = await get_patient(id)
    if not patient:
        return Response(status_code=404)

    history = await get_messages(id)
    patient_ctx = _build_patient_context(patient)

    # RAG: embed question and retrieve relevant document chunks
    try:
        q_embedding = await embed_query(body.message)
        relevant_chunks = rag_query(q_embedding, patient_id=id, n_results=6)
    except Exception:
        relevant_chunks = []

    rag_context = ""
    if relevant_chunks:
        rag_context = "\n\n--- RELEVANT DOCUMENTS (retrieved via RAG) ---\n"
        for i, chunk in enumerate(relevant_chunks, 1):
            rag_context += f"\n[Doc chunk {i}]:\n{chunk}\n"
        rag_context += "--- END DOCUMENTS ---\n"

    system_prompt = f"""You are MedSyn AI — an elite clinical intelligence system embedded in a physician's workflow in Africa. You reason like a senior consultant at a world-class teaching hospital who also has deep knowledge of African epidemiology, tropical medicine, endemic diseases, resource-limited settings, and WHO/Africa CDC guidelines.

PATIENT PROFILE:
{patient_ctx}
{rag_context}
YOUR CAPABILITIES:
- Synthesize clinical data, lab results, imaging reports, and uploaded documents
- Recognize rare, tropical, and neglected diseases common in sub-Saharan Africa
- Flag drug interactions, contraindications, and dosing concerns
- Suggest cost-effective, locally available diagnostics and treatments
- Interpret lab values in context (not just normal ranges)
- Cross-reference findings across multiple documents via semantic retrieval
- Spot red flags and life-threatening conditions immediately

OUTPUT RULES — NON-NEGOTIABLE:
- Respond in 3-6 bullet points maximum
- Each bullet: one sharp clinical insight, no filler
- Lead with the most important finding
- No greetings, no disclaimers, no "as an AI" hedging
- If something is urgent, say URGENT: at the start
- Markdown bold for key terms only
- Think like a doctor, write like a telegram"""

    gemini_history = []
    for msg in history:
        gemini_history.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [{"text": msg["content"]}]
        })

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    await save_message(id, "user", body.message)

    async def stream():
        full_response = ""
        try:
            response = client.models.generate_content_stream(
                model="models/gemini-2.5-flash",
                contents=gemini_history + [{"role": "user", "parts": [{"text": body.message}]}],
                config={"system_instruction": system_prompt}
            )
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if full_response:
                await save_message(id, "assistant", full_response)
            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}
    )

# ── Patient rare disease investigation (Manus + all documents) ───────────────

@app.post("/patients/{id}/investigate")
async def investigate_patient(id: int):
    global _active_task_id
    await _stop_active_task()

    patient = await get_patient(id)
    if not patient:
        return Response(status_code=404)

    # Build structured patient profile
    patient_ctx = _build_patient_context(patient)

    # Pull every single stored chunk for this patient — no limit, no embedding needed
    try:
        chunks = get_all_patient_chunks(id)
    except Exception:
        chunks = []

    # Build full context: patient profile + all document content
    doc_section = ""
    if chunks:
        doc_section = "\n\n=== UPLOADED CLINICAL DOCUMENTS ===\n"
        for i, chunk in enumerate(chunks, 1):
            doc_section += f"\n[Document chunk {i}]:\n{chunk}\n"
        doc_section += "=== END DOCUMENTS ==="

    full_context = f"{patient_ctx}{doc_section}"

    async def event_generator():
        global _active_task_id
        async for chunk in run_manus(full_context):
            if '"task_id"' in chunk and _active_task_id is None:
                try:
                    data = json.loads(chunk.replace('data: ', '').strip())
                    tid = data.get('data', {}).get('task_id')
                    if tid:
                        _active_task_id = tid
                except Exception:
                    pass
            if '"done"' in chunk:
                try:
                    data = json.loads(chunk.replace('data: ', '').strip())
                    report = data.get('data', {}).get('report')
                    if report:
                        await save_investigation(report)
                except Exception:
                    pass
            yield chunk
        _active_task_id = None

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}
    )

# ── Benchmark results ─────────────────────────────────────────────────────────

class BenchmarkResultIn(BaseModel):
    case_id: str
    patient_id: int
    verdict: str
    score: int
    differentials: list = []
    tools: list = []
    full_report: dict = {}

@app.post("/benchmark/results")
async def save_bench_result(body: BenchmarkResultIn):
    await save_benchmark_result(
        body.case_id, body.patient_id, body.verdict,
        body.score, body.differentials, body.tools, body.full_report
    )
    return {"ok": True}

@app.get("/benchmark/results")
async def list_bench_results():
    rows = await get_benchmark_results()
    return {"results": rows}

@app.delete("/benchmark/results/{case_id}")
async def del_bench_result(case_id: str):
    await delete_benchmark_result(case_id)
    return {"ok": True}

@app.delete("/benchmark/results")
async def clear_bench_results():
    await clear_benchmark_results()
    return {"ok": True}

# ── Body part analysis ────────────────────────────────────────────────────────

BODY_PARTS_PROMPT = """You are a clinical AI. Based on the patient data and documents below, identify which body parts/regions are affected, mentioned, or clinically relevant.

VALID BODY PART SLUGS (only use these exact values):
head, neck, chest, abs, obliques, upper-back, lower-back, trapezius, deltoids, biceps, triceps, forearm, hands, gluteal, adductors, abductors, quadriceps, hamstring, knees, calves, tibialis, ankles, feet

PATIENT DATA:
{patient_ctx}

DOCUMENT CONTENT (from RAG):
{doc_context}

Return ONLY a valid JSON object, no markdown, no explanation:
{{"affected_parts": ["slug1", "slug2"], "reasoning": {{"slug1": "one sentence why", "slug2": "one sentence why"}}}}

Be precise. Only include parts with clear clinical relevance from the data."""

@app.get("/patients/{id}/body-parts")
async def analyze_body_parts(id: int):
    patient = await get_patient(id)
    if not patient:
        return Response(status_code=404)

    patient_ctx = _build_patient_context(patient)

    # Pull all document chunks for this patient
    try:
        q_embedding = await embed_query("affected body parts symptoms pain location")
        chunks = rag_query(q_embedding, patient_id=id, n_results=12)
    except Exception:
        chunks = []

    doc_context = "\n\n".join(chunks) if chunks else "No documents uploaded."

    prompt = BODY_PARTS_PROMPT.format(patient_ctx=patient_ctx, doc_context=doc_context[:6000])

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    try:
        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt,
        )
        text = response.text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        return {"affected_parts": result.get("affected_parts", []), "reasoning": result.get("reasoning", {})}
    except Exception as e:
        return {"affected_parts": [], "reasoning": {}, "error": str(e)}
