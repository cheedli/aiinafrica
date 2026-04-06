"""
ChromaDB vectorstore — persists to disk, filtered by patient_id.
"""
import os
import chromadb
from chromadb.config import Settings

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

_client = None
_collection = None

def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False)
        )
        _collection = _client.get_or_create_collection(
            name="patient_docs",
            metadata={"hnsw:space": "cosine"}
        )
    return _collection

def upsert_chunks(chunks: list[dict]):
    """
    chunks: list of {id, embedding, document, metadata}
    metadata must include patient_id (int stored as str)
    """
    col = _get_collection()
    col.upsert(
        ids=[c["id"] for c in chunks],
        embeddings=[c["embedding"] for c in chunks],
        documents=[c["document"] for c in chunks],
        metadatas=[c["metadata"] for c in chunks],
    )

def query(embedding: list[float], patient_id: int, n_results: int = 6) -> list[str]:
    col = _get_collection()
    count = col.count()
    if count == 0:
        return []
    results = col.query(
        query_embeddings=[embedding],
        n_results=min(n_results, count),
        where={"patient_id": str(patient_id)},
        include=["documents"],
    )
    return results["documents"][0] if results["documents"] else []

def get_all_patient_chunks(patient_id: int) -> list[str]:
    """Return every stored chunk for a patient — no limit, no embedding needed."""
    col = _get_collection()
    results = col.get(where={"patient_id": str(patient_id)}, include=["documents"])
    return results["documents"] if results["documents"] else []

def delete_patient_docs(patient_id: int):
    col = _get_collection()
    results = col.get(where={"patient_id": str(patient_id)})
    if results["ids"]:
        col.delete(ids=results["ids"])
