"""
Embedding + ingestion pipeline.
- PDFs → PyMuPDF text extraction
- Images → Gemini 2.5 Flash Vision → text → embed
- Text → chunk → embed with text-embedding-004 → store in ChromaDB
"""
import os
import base64
import hashlib
import textwrap
import fitz  # PyMuPDF
from google import genai
from google.genai import types
from .vectorstore import upsert_chunks

CHUNK_SIZE = 800      # characters per chunk
CHUNK_OVERLAP = 100   # overlap between chunks

def _gemini_client():
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ── Text chunking ─────────────────────────────────────────────────────────────

def _chunk_text(text: str, source: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks

# ── Extraction ────────────────────────────────────────────────────────────────

def _extract_pdf(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    return "\n\n".join(pages)

def _extract_image_with_gemini(content: bytes, filename: str) -> str:
    client = _gemini_client()
    ext = filename.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                "webp": "image/webp", "gif": "image/gif", "bmp": "image/bmp"}
    mime = mime_map.get(ext, "image/jpeg")

    prompt = """You are a medical document analyst. Analyze this medical document/image thoroughly.

Extract and provide:
1. ALL text visible in the image (OCR) — exact transcription
2. Patient information (name, ID, DOB, blood type, etc.)
3. Medical findings, measurements, values, units
4. Clinical interpretation of any scan, X-ray, or medical image
5. Any abnormalities, diagnoses, or clinical notes visible

Be exhaustive. Every piece of information matters for clinical decision support."""

    response = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=content, mime_type=mime),
            prompt
        ]
    )
    return response.text or ""

# ── Embedding ─────────────────────────────────────────────────────────────────

def _embed_texts(texts: list[str]) -> list[list[float]]:
    client = _gemini_client()
    embeddings = []
    # Batch in groups of 100 (API limit)
    for i in range(0, len(texts), 100):
        batch = texts[i:i+100]
        result = client.models.embed_content(
            model="models/gemini-embedding-2-preview",
            contents=batch,
        )
        embeddings.extend([e.values for e in result.embeddings])
    return embeddings

# ── Main ingest ───────────────────────────────────────────────────────────────

async def ingest_document(
    patient_id: int,
    filename: str,
    content: bytes,
    doc_id: str = None,
) -> dict:
    """
    Ingest a document (PDF or image) for a patient.
    Returns summary of what was extracted.
    """
    ext = filename.rsplit(".", 1)[-1].lower()
    is_pdf = ext == "pdf"
    is_image = ext in ("jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif")

    if is_pdf:
        raw_text = _extract_pdf(content)
        source_type = "pdf"
        # Also check if PDF has pages that are images (scanned PDF)
        if len(raw_text.strip()) < 100:
            # Likely scanned PDF — render pages as images and use Vision
            doc = fitz.open(stream=content, filetype="pdf")
            all_text = []
            for page_num, page in enumerate(doc):
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                page_text = _extract_image_with_gemini(img_bytes, f"page_{page_num}.png")
                all_text.append(f"[Page {page_num+1}]\n{page_text}")
            raw_text = "\n\n".join(all_text)
            source_type = "scanned_pdf"
    elif is_image:
        raw_text = _extract_image_with_gemini(content, filename)
        source_type = "image"
    else:
        raw_text = content.decode("utf-8", errors="ignore")
        source_type = "text"

    if not raw_text.strip():
        return {"filename": filename, "chunks": 0, "source_type": source_type, "preview": "No text extracted"}

    # Chunk
    chunks = _chunk_text(raw_text, filename)
    if not chunks:
        return {"filename": filename, "chunks": 0, "source_type": source_type, "preview": "Empty after chunking"}

    # Embed
    embeddings = _embed_texts(chunks)

    # Build ChromaDB records
    file_hash = doc_id or hashlib.md5(content).hexdigest()[:8]
    records = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        records.append({
            "id": f"p{patient_id}_{file_hash}_{i}",
            "embedding": embedding,
            "document": chunk,
            "metadata": {
                "patient_id": str(patient_id),
                "filename": filename,
                "source_type": source_type,
                "chunk_index": i,
            }
        })

    upsert_chunks(records)

    return {
        "filename": filename,
        "chunks": len(chunks),
        "source_type": source_type,
        "preview": raw_text[:300].replace("\n", " ").strip()
    }

async def embed_query(question: str) -> list[float]:
    client = _gemini_client()
    result = client.models.embed_content(
        model="models/gemini-embedding-2-preview",
        contents=[question],
    )
    return result.embeddings[0].values
