"""
Seed benchmark patients into MedSyn from benchmark_cases.json.
Creates each patient WITHOUT the correct diagnosis fields.
Stores the mapping in benchmark_map.json for the Benchmark page.
"""
import json
import requests
import time

API = "http://localhost:8000"

with open("benchmark_cases.json") as f:
    cases = json.load(f)

mapping = []

for case in cases:
    p = case["patient"]
    pres = case["presentation"]

    payload = {
        "first_name": p["first_name"],
        "last_name": p["last_name"],
        "age": p["age"],
        "sex": p["sex"],
        "country": p["country"],
        "region": p["region"],
        "blood_type": p.get("blood_type", ""),
        "patient_id": p["patient_id"],
        # Clinical data — NO correct diagnosis, NO hints
        "chief_complaint": pres["chief_complaint"],
        "history": pres["history"],
        "medications": pres["medications"],
        "allergies": pres["allergies"],
        "lab_results": pres["lab_results"],
        "notes": pres["notes"],
    }

    resp = requests.post(f"{API}/patients", json=payload)
    if resp.status_code not in (200, 201):
        print(f"[FAIL] {case['case_id']}: {resp.status_code} {resp.text[:200]}")
        continue

    created = resp.json()
    patient_id = created["id"]

    mapping.append({
        "case_id": case["case_id"],
        "patient_id": patient_id,
        "wrong_diagnosis": case["wrong_diagnosis"]["diagnosis"],
        "wrong_reasoning": case["wrong_diagnosis"]["reasoning"],
        "correct_diagnosis": case["correct_diagnosis"]["disease_name"],
        "correct_orpha": case["correct_diagnosis"].get("orpha_code", ""),
        "correct_icd11": case["correct_diagnosis"].get("icd11_code", ""),
        "correct_reasoning": case["correct_diagnosis"]["reasoning"],
        "regional_context": case["correct_diagnosis"]["regional_context"],
        "key_clues": case["benchmark"]["key_clues"],
        "red_herrings": case["benchmark"]["red_herrings"],
        "expected_differentials": case["benchmark"]["expected_differentials"],
        "difficulty": case["benchmark"]["difficulty"],
        "source": case["source"],
        "country": p["country"],
        "patient_name": f"{p['first_name']} {p['last_name']}",
    })

    print(f"[OK] {case['case_id']} → patient #{patient_id} ({p['first_name']} {p['last_name']}, {p['country']})")
    time.sleep(0.3)

with open("medsyn-frontend/public/benchmark_map.json", "w") as f:
    json.dump(mapping, f, indent=2)

print(f"\nDone. {len(mapping)}/{len(cases)} patients created.")
print("Mapping saved to medsyn-frontend/public/benchmark_map.json")
