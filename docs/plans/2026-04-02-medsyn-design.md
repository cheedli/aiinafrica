# MedSyn Investigator — Full Design
Date: 2026-04-02

## Stack
- Frontend: React + Vite, Tailwind CSS, Framer Motion, claymorphism theme
- Backend: FastAPI (Python)
- AI: Gemini 2.0 Flash (reasoning + multilingual), Florence-2 (medical image captioning)
- External APIs: PubMed E-utilities, Orphanet API, WHO GHO API
- PDF export: WeasyPrint
- Streaming: Server-Sent Events (SSE)

## Input
- Text (typed/pasted, any language — AR/FR/EN auto-detected)
- PDF (lab reports, discharge letters — PyMuPDF extraction)
- Images (scans, photos — Florence-2 captioning before Gemini)

## Agent Flow
1. FastAPI receives multipart upload
2. Florence-2 captions images → PyMuPDF extracts PDF text → unified context built
3. Gemini 2.0 extracts symptoms/history, detects language
4. LangGraph Manus agent fires parallel tool calls: PubMed + Orphanet + WHO GHO
5. Gemini 2.0 synthesizes → ranked DDx + evidence + action plan
6. SSE stream sends steps + report sections to frontend
7. PDF export on demand

## SSE Event Types
- `step` — live agent action description
- `data` — intermediate findings
- `section` — completed report section (triggers card pop-in)
- `done` — signals completion

## Backend Structure
```
medsyn-backend/
├── main.py
├── agent/
│   ├── manus.py
│   ├── tools/pubmed.py
│   ├── tools/orphanet.py
│   ├── tools/who_gho.py
│   └── reasoning.py
├── ingestion/
│   ├── pdf_extractor.py
│   ├── image_captioner.py
│   └── input_processor.py
├── report/
│   ├── builder.py
│   └── pdf_export.py
└── models/schemas.py
```

## Frontend Structure
```
medsyn-frontend/
├── src/
│   ├── components/
│   │   ├── layout/Navbar.jsx, PageWrapper.jsx
│   │   ├── upload/UploadZone.jsx, FilePreview.jsx
│   │   ├── investigation/AgentFeed.jsx, StepCard.jsx, TypingIndicator.jsx
│   │   ├── report/ReportPanel.jsx, DiagnosisCard.jsx, EvidenceCard.jsx, ActionPlanCard.jsx, ExportButton.jsx
│   │   └── ui/ClayCard.jsx, ConfidenceBar.jsx
│   ├── hooks/useAgentStream.js
│   ├── pages/Home.jsx, Investigation.jsx
│   ├── styles/clay.css
│   └── App.jsx
```

## Output Report Sections
1. Ranked differential diagnoses (confidence scores, Orphanet links)
2. PubMed evidence citations per diagnosis
3. Regional prevalence context (WHO GHO weighted)
4. Recommended tests to order
5. Specialists to consult
6. Hypotheses to rule out first
7. PDF export of full clinical brief

## UI/UX
- Claymorphism: soft pastels (lavender/mint/peach/sky), 20-28px border-radius, 3px colored borders, multi-layer box-shadow, backdrop-blur
- Home: full-screen gradient, 3 upload zone cards, animated floating blobs, CTA button
- Investigation: 40/60 split — left=live agent feed (clay pills), right=report cards populating live
- Animations: Framer Motion spring pop-in, confidence bar fill, hover lift
- Language: auto-detected, output matches input language
