# MedSyn Investigator

**AI-powered rare disease diagnosis for Africa — closing the 5-year diagnostic gap at point of care.**

Built for the [AI4SDG3 Challenge](https://gitexafrica.com) · GITEX Africa 2026 · SDG 3: Good Health & Well-Being

**Team:** MedSyn · **University:** ESPRIT · **Member:** Chedhly Ghorel

---

## The Problem

Africa carries 24% of the global disease burden with fewer than 3% of the world's health workers. For rare disease patients, the gap is catastrophic:

- **3.6–4.8 million** rare disease patients in Africa — fewer than 1 in 10 correctly diagnosed
- **5–7 years** average time to correct diagnosis
- **4–6 misdiagnoses** before the right answer is found
- **56 million women** have Female Genital Schistosomiasis — only ~15,000 ever formally assessed
- Fewer than **50 genetic counselors** on the entire continent

## The Solution

MedSyn Investigator is a clinical AI platform that surfaces the correct rare diagnosis **at first contact** — before years of misdiagnosis accumulate. A physician enters patient symptoms, lab results, history, and uploaded documents. The system reasons across Orphanet, PubMed, WHO regional data, and African geographic epidemiology to return a ranked differential with confidence levels and investigation steps.

---

## Features

- **Multi-modal input** — free text, PDF reports, lab results, medical images
- **Rare & tropical disease reasoning** tuned for African epidemiology and endemic zones
- **RAG document retrieval** — uploaded patient records inform AI responses via ChromaDB
- **Live AI investigation feed** — real-time tool call animation as Manus researches
- **Patient management** — full CRUD with persistent clinical history and messaging
- **Interactive body map** — anatomical symptom localization
- **AI clinical chat** — Gemini 2.5 Flash streaming assistant per patient
- **PDF export** — full diagnostic report generation
- **Diagnostic benchmark** — tested against 15 real African clinical cases

---

## Benchmark Results

Validated against **15 real documented clinical cases** from published African medical literature — each a real patient who was misdiagnosed for years. Cases span **13 countries** across all 5 African sub-regions.

| Metric | Result |
|--------|--------|
| Cases tested | 15 |
| Correct diagnoses identified | **15 / 15 (100%)** |
| Countries represented | 13 |
| African sub-regions | All 5 |
| Combined real-world diagnostic delay | 47+ patient-years |
| Disease categories | 7 |

See [`docs/BENCHMARK_STATS.md`](docs/BENCHMARK_STATS.md) for full case-by-case breakdown.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agent | Manus AI — autonomous multi-step reasoning |
| AI Chat | Google Gemini 2.5 Flash |
| Backend | FastAPI + SQLite + ChromaDB |
| Frontend | React + Framer Motion + Tailwind CSS |
| Embeddings | Google text-embedding-004 |
| PDF / OCR | PyMuPDF + pytesseract |

---

## Project Structure

```
aiinafrica/
├── medsyn-backend/          # FastAPI backend
│   ├── main.py              # All API endpoints
│   ├── db.py                # SQLite database layer
│   ├── agent/
│   │   ├── manus.py         # Manus AI agent integration + SSE streaming
│   │   └── reasoning.py     # Gemini fallback reasoning
│   ├── ingestion/           # PDF, image, text input processing
│   ├── rag/                 # ChromaDB vector store + embeddings
│   ├── models/              # Pydantic schemas
│   ├── report/              # PDF export
│   └── requirements.txt
├── medsyn-frontend/         # React frontend
│   └── src/
│       ├── pages/
│       │   ├── Investigation.jsx   # Main diagnosis interface
│       │   ├── Patients.jsx        # Patient management + rare disease panel
│       │   ├── Benchmark.jsx       # 15-case diagnostic benchmark
│       │   ├── History.jsx         # Investigation history
│       │   └── Dashboard.jsx       # Stats overview
│       ├── components/
│       │   ├── investigation/      # AgentFeed, TypingIndicator, ReportPanel
│       │   └── patient/            # BodyMap, chat components
│       └── hooks/
│           └── useAgentStream.js   # SSE streaming hook
├── benchmark_cases.json     # 15 benchmark case definitions
├── seed_benchmark.py        # Seeds benchmark patients into DB
├── clean_benchmark.py       # Removes diagnosis leaks from patient data
└── docs/
    ├── BENCHMARK_STATS.md   # Full benchmark statistics
    ├── DEMO_STATS.md        # Pitch-ready impact statistics
    └── links.json           # All research sources
```

---

## Getting Started

### Backend

```bash
cd medsyn-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create .env file
echo "MANUS_API_KEY=your_key" > .env
echo "GEMINI_API_KEY=your_key" >> .env

uvicorn main:app --reload
```

### Frontend

```bash
cd medsyn-frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`, API at `http://localhost:8000`.

### Seed Benchmark Cases

```bash
# From repo root (with backend running)
python seed_benchmark.py
python clean_benchmark.py
```

---

## Research & Sources

All 15 benchmark cases are sourced from peer-reviewed publications. See [`docs/links.json`](docs/links.json) for the full reference list with PubMed IDs and URLs.

---

## Deliverables

| Deliverable | File |
|-------------|------|
| D1 — Problem Statement | `deliverable1_medsyn.pdf` |
| D4 — Algorithm & Prototype | `deliverable4_medsyn.pdf` |
