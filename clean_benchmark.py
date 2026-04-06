"""
Rewrite lab_results and notes for all benchmark patients to remove
any confirming test results or disease name leaks.
Then update each patient in the DB.
"""
import json
import requests

API = "http://localhost:8000"

CLEAN = {
    "BENCH-001": {
        "lab_results": (
            "Hemoglobin: 5.9 g/dL (ref 11.5-15.5). Platelets: 76,000/uL (ref 150,000-450,000). "
            "WBC: 2.1x10^3/uL (ref 4.0-11.0). Peripheral blood smear: ring forms of Plasmodium falciparum (low density). "
            "Bone marrow biopsy: large macrophages with abundant pale cytoplasm crowding out hematopoietic elements (pending specialist review). "
            "X-ray distal femur: flask-shaped deformity at metaphysis. Spleen: 8 cm below costal margin on palpation. Liver: 12 cm below costal margin."
        ),
        "notes": (
            "Massive hepatosplenomegaly. Mild jaundice. Afebrile at last admission. "
            "No improvement in hemoglobin or spleen size after 3 courses of anti-malarials. "
            "Bone marrow shows atypical macrophage infiltration — specialist review pending."
        ),
    },
    "BENCH-002": {
        "lab_results": (
            "CRP: 184.96 mg/L (ref <5.0). ESR: 110 mm/h (ref <20). LDH: 2128 IU/L (ref 140-280). "
            "Serum ferritin: massively elevated (>10,000 ng/mL, ref 10-150). "
            "Glycosylated ferritin fraction: <20%. "
            "Sputum culture: negative x3. Blood culture: negative x2. ANA: negative. "
            "Chest X-ray: bilateral pulmonary opacities. CBC: WBC 18,000/uL with neutrophilia."
        ),
        "notes": (
            "No response to 6 weeks of anti-TB therapy. Rash more prominent during fever spikes. "
            "Mental confusion emerging. No infectious source identified on extensive workup. "
            "Ferritin disproportionately elevated relative to other inflammatory markers."
        ),
    },
    "BENCH-003": {
        "lab_results": (
            "AST: 287 IU/L (ref 15-40). ALT: 139 IU/L (ref 13-34). Albumin: 10.2 g/L (ref 30-50). "
            "Globulin: 78.3 g/L (ref 18-30). Total bilirubin: 2.8 mg/dL. "
            "ANA titer: 1:320 (positive). Anti-smooth muscle antibody (ASMA): positive. "
            "FSH: <1 mIU/L. LH: <1 mIU/L. HBsAg: negative. Anti-HCV: negative. "
            "Abdominal ultrasound: coarse liver echotexture, signs of portal hypertension. "
            "Upper GI endoscopy: Grade 2 esophageal varices. IgG: markedly elevated."
        ),
        "notes": (
            "Established cirrhosis on imaging with portal hypertension. "
            "Gonadotropin suppression with no clear endocrine primary cause. "
            "No jaundice despite advanced liver disease. Family history: mother with autoimmune thyroid disease."
        ),
    },
    "BENCH-004": {
        "lab_results": (
            "HIV ELISA: negative x3. CD4 count: 780 cells/uL. CBC: mild normocytic anemia (Hb 10.8 g/dL). "
            "CT neck/chest: localized mass in left supratonsillar fossa (6x4cm), no distant metastases. "
            "Histopathology post-resection: spindle-shaped cells, vascular slits, extravasated red blood cells. "
            "Immunohistochemistry: CD31 positive, CD34 positive. Viral PCR panel: pending specialist lab."
        ),
        "notes": (
            "Firm, reddish-purplish, non-tender oropharyngeal mass. Immunocompetent patient. "
            "Lesion regrew rapidly after partial surgical excision. "
            "Histology shows vascular spindle cell proliferation — specialist review requested."
        ),
    },
    "BENCH-005": {
        "lab_results": (
            "CBC: mild leukocytosis (WBC 11,200/uL). ESR: 45 mm/h. CRP: 22 mg/L. "
            "CT pelvis/perineum: subcutaneous thickening, tumefied masses with multiple draining tracts, no bony invasion. "
            "Discharge microscopy: dark granules present. Gram stain: no bacteria. "
            "Histopathology of granules: pending specialist mycology lab."
        ),
        "notes": (
            "Dark granules visible in serous-purulent discharge. Lesion indurated, painless. "
            "Located on left buttock. No improvement after multiple antibiotic courses and incision/drainage procedures. "
            "10-year chronic progressive course."
        ),
    },
    "BENCH-006": {
        "lab_results": (
            "CBC: normal. ESR: 38 mm/h. CRP: 18 mg/L. Mantoux test: 18mm (positive). "
            "Chest X-ray: normal, no pulmonary lesions. "
            "Histopathology of surgical biopsy: granulomas with giant cells and epithelioid cells — no grains identified. "
            "Special stains: pending specialist lab (ZN, fungal stains)."
        ),
        "notes": (
            "Biopsy failed to show characteristic granules — mycetoma not confirmed histologically. "
            "Langhans-type giant cells on biopsy. Positive Mantoux despite normal chest X-ray. "
            "7-year chronic foot lesion with sinus tract discharging pus."
        ),
    },
    "BENCH-007": {
        "lab_results": (
            "CBC: eosinophils 3,784/mm3 (ref <500) — marked hypereosinophilia. "
            "ESR: 70 mm/h. CRP: 28 mg/L. IgE: markedly elevated. "
            "Skin biopsy histopathology: broad non-septate hyphae surrounded by eosinophilic amorphous material. "
            "PCR M. ulcerans: NEGATIVE. Culture: pending specialist mycology lab."
        ),
        "notes": (
            "Hard, well-defined subcutaneous plaque on left thigh. No ulceration. No discharge. "
            "No response to 8-week rifampicin/streptomycin regimen. "
            "Marked peripheral blood eosinophilia is unexplained. Biopsy shows unusual histological pattern."
        ),
    },
    "BENCH-008": {
        "lab_results": (
            "During episode: WBC 18,500/uL with neutrophilia. CRP: 145 mg/L. Fibrinogen: elevated. "
            "SAA (serum amyloid A): markedly elevated. "
            "Blood cultures x4: negative. Malaria RDT x6: all negative. "
            "ANA: negative. ANCA: negative. Urinalysis: proteinuria 1+. "
            "Genetic testing: pending referral to specialist center."
        ),
        "notes": (
            "Episodic self-resolving fevers every 4-6 weeks, complete recovery between attacks. "
            "Erysipelas-like erythema on lower limbs during attacks. "
            "Sterile peritonitis pattern on imaging during episodes. "
            "Brother has similar undiagnosed recurrent fevers."
        ),
    },
    "BENCH-009": {
        "lab_results": (
            "CBC: normal. Blood glucose: normal. CSF: normal (cells, protein, glucose all normal). "
            "Urinary thiocyanate: markedly elevated (>100 umol/L, ref <50). "
            "Plasma cyanide: elevated. Serum amino acids: low sulfur-containing amino acids. "
            "Stool PCR panel: negative. MRI spine (referral): signal changes in lateral corticospinal tracts."
        ),
        "notes": (
            "Spastic paraparesis — bilateral hyperreflexia and ankle clonus. Sensation intact. Scissor gait. "
            "Multiple children in same village similarly affected during drought period. "
            "Family diet: almost exclusively bitter cassava, improperly processed due to water shortage. "
            "Cognitive function intact."
        ),
    },
    "BENCH-010": {
        "lab_results": (
            "Wuchereria bancrofti antigen test (ICT card): NEGATIVE. "
            "Night blood smear for microfilariae: NEGATIVE x2. "
            "Eosinophil count: normal (350/uL). IgE: slightly elevated. "
            "Doppler ultrasound lower limbs: no filarial dance sign. "
            "Altitude of residence: 1,820m ASL. Soil type: volcanic red clay (confirmed by local health authority)."
        ),
        "notes": (
            "Bilateral lower limb swelling ascending from feet, mossy papillomatous skin texture. "
            "Negative filarial tests despite clinical picture resembling lymphedema. "
            "Lives permanently at high altitude on volcanic soil, works barefoot as farmer. "
            "Two brothers with similar leg swelling."
        ),
    },
    "BENCH-011": {
        "lab_results": (
            "Thick blood smear: motile parasites identified — specialist confirmation pending. "
            "CBC: anemia (Hb 9.2 g/dL), lymphocytosis. CRP: 210 mg/L. "
            "CSF: protein 85 mg/dL (elevated), WBC 22 cells/uL (lymphocytes), motile organisms in CSF. "
            "Rickettsia africae IFA: NEGATIVE. Widal/Weil-Felix: negative."
        ),
        "notes": (
            "Well-demarcated ulcerated skin lesion (chancre, 3cm) on left thigh at presumed bite site. "
            "Rapid CNS progression within 2 weeks — confusion and agitation. "
            "Safari in Mana Pools National Park (tsetse fly habitat). No response to doxycycline. "
            "Negative Rickettsia serology."
        ),
    },
    "BENCH-012": {
        "lab_results": (
            "ANA: 1:320 (positive). ESR: 88 mm/h. CRP: 42 mg/L. Anti-dsDNA: weakly positive. "
            "Complement C3/C4: normal. "
            "Skin biopsy (forearm lesion): epithelioid granulomas, acid-fast bacilli on Fite-Faraco stain (bacillary index 4+). "
            "Nerve conduction: thickened ulnar nerve on palpation, sensory action potential reduced. "
            "Slit skin smear: acid-fast bacilli positive."
        ),
        "notes": (
            "Skin lesions worsened under 6 years of immunosuppressive therapy. "
            "Progressive peripheral neuropathy — anesthetic patches on hands and feet. "
            "Loss of eyebrow hair (madarosis). Skin thickening progressive. "
            "ANA positivity present but complement levels normal — atypical for lupus."
        ),
    },
    "BENCH-013": {
        "lab_results": (
            "Colposcopy: 'grainy sandy patches' on cervix with abnormal blood vessels. "
            "Cervical biopsy: eosinophilic granulomatous inflammation, parasitic ova with terminal spines identified in cervical tissue. "
            "Urine microscopy: ova with terminal spines (30 eggs/10mL). "
            "Serology: anti-helminth IgG positive. HPV DNA: negative. "
            "Pap smear review: reactive changes, no dysplasia confirmed."
        ),
        "notes": (
            "Freshwater exposure (swimming in irrigation canals) in childhood in endemic region. "
            "Colposcopic findings initially reported as suspicious for neoplasia. "
            "HPV negative. Ova with terminal spines confirmed in urine and cervical biopsy. "
            "HIV counseling initiated given mucosal disruption."
        ),
    },
    "BENCH-014": {
        "lab_results": (
            "AST: 1,240 IU/L. ALT: 890 IU/L. Total bilirubin: 18.4 mg/dL. Direct bilirubin: 12.1 mg/dL. "
            "Alkaline phosphatase: NORMAL (discordantly normal despite severe hepatocellular damage). "
            "INR: 3.8. Albumin: 18 g/L. "
            "CBC: Hb 7.2 g/dL, Coombs test: NEGATIVE. Blood smear: fragmented RBCs. "
            "Serum ceruloplasmin: <5 mg/dL (ref 20-60). 24h urine copper: 820 ug/day (ref <100). "
            "Slit-lamp examination: corneal deposits present. Gene sequencing: pending specialist."
        ),
        "notes": (
            "Acute liver failure in a 14-year-old. No viral hepatitis markers. No alcohol, no hepatotoxic drugs. "
            "Parents are consanguineous (first cousins). Younger sister has unexplained tremor and behavioral changes. "
            "Coombs-negative hemolytic anemia concurrent with liver failure. "
            "Alkaline phosphatase paradoxically normal despite severe liver injury."
        ),
    },
    "BENCH-015": {
        "lab_results": (
            "CSF: opening pressure 320 mmH2O (elevated). CSF WBC: 20 lymphocytes. "
            "CSF protein: 65 mg/dL. CSF glucose: normal. CSF culture: negative. TB PCR CSF: negative. "
            "MRI brain: no parenchymal lesions. "
            "DSA cerebral vessels: non-visualization of transverse sinus. "
            "HLA-B51: positive. Pathergy test: positive. ANA: negative. ANCA: negative."
        ),
        "notes": (
            "Recurrent painful oral ulcers (4-5 per year since age 20) — previously dismissed. "
            "Single genital ulcer episode 1 year ago. Right leg DVT developing 2 months into presentation. "
            "No response to anti-TB therapy. Positive Mantoux in TB-endemic region. "
            "HLA-B51 positive. Pathergy test positive. CVT confirmed on DSA."
        ),
    },
}

# Load current patients to get their IDs
resp = requests.get(f"{API}/patients")
patients = {p["patient_id"]: p for p in resp.json()["patients"]}

with open("benchmark_cases.json") as f:
    cases = json.load(f)

for case in cases:
    cid = case["case_id"]
    clean = CLEAN.get(cid)
    if not clean:
        print(f"[SKIP] {cid} — no clean version defined")
        continue

    pid_str = case["patient"]["patient_id"]  # e.g. "BENCH-001"
    patient = patients.get(pid_str)
    if not patient:
        print(f"[MISS] {cid} — patient {pid_str} not found in DB")
        continue

    db_id = patient["id"]
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
        "chief_complaint": pres["chief_complaint"],
        "history": pres["history"],
        "medications": pres["medications"],
        "allergies": pres["allergies"],
        "lab_results": clean["lab_results"],
        "notes": clean["notes"],
    }

    r = requests.put(f"{API}/patients/{db_id}", json=payload)
    if r.status_code == 200:
        print(f"[OK] {cid} → patient #{db_id} cleaned")
    else:
        print(f"[FAIL] {cid}: {r.status_code} {r.text[:100]}")
