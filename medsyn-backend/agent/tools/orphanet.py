import httpx
from typing import Optional, Dict

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
            prevalence_list = first.get("PrevalenceList", [])
            prevalence = prevalence_list[0].get("ValMoy", "Unknown") if prevalence_list else "Unknown"
            return {
                "orpha_code": str(orpha_code) if orpha_code else None,
                "name": first.get("Name", disease_name),
                "orphanet_url": f"https://www.orpha.net/consor/cgi-bin/OC_Exp.php?Lng=EN&Expert={orpha_code}" if orpha_code else None,
                "prevalence": prevalence
            }
        except Exception:
            return None
