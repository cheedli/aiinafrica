from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse
from typing import List, Optional
from dotenv import load_dotenv
import os

load_dotenv()

from agent.manus import run_manus
from ingestion.input_processor import build_unified_context
from report.pdf_export import build_pdf
from models.schemas import ClinicalReport

app = FastAPI(title="MedSyn Investigator API", version="1.0")

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
