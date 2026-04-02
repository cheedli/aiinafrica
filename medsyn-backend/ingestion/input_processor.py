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
