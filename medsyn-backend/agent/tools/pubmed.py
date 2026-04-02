import httpx
import os
from typing import List
import sys
sys.path.insert(0, '/Users/octa/Desktop/aiinafrica/medsyn-backend')
from models.schemas import Evidence

PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

async def search_pubmed(query: str, max_results: int = 8) -> List[Evidence]:
    api_key = os.getenv("NCBI_API_KEY", "")
    params = {"db": "pubmed", "term": query, "retmax": max_results, "retmode": "json"}
    if api_key:
        params["api_key"] = api_key
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            search_resp = await client.get(f"{PUBMED_BASE}/esearch.fcgi", params=params)
            search_data = search_resp.json()
            ids = search_data.get("esearchresult", {}).get("idlist", [])
            if not ids:
                return []
            summary_resp = await client.get(f"{PUBMED_BASE}/esummary.fcgi", params={
                "db": "pubmed", "id": ",".join(ids), "retmode": "json"
            })
            summary_data = summary_resp.json()
            results = summary_data.get("result", {})
            evidence = []
            for pmid in ids:
                art = results.get(pmid, {})
                if not art or not isinstance(art, dict):
                    continue
                authors_list = art.get("authors", [])
                authors = ", ".join([a.get("name", "") for a in authors_list[:3]])
                pubdate = art.get("pubdate", "2000")
                year = int(pubdate[:4]) if pubdate and len(pubdate) >= 4 and pubdate[:4].isdigit() else 2000
                evidence.append(Evidence(
                    pmid=pmid,
                    title=art.get("title", "Unknown title"),
                    authors=authors or "Unknown authors",
                    journal=art.get("fulljournalname", art.get("source", "")),
                    year=year,
                    url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    relevance_note=""
                ))
            return evidence
        except Exception:
            return []
