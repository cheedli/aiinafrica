import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import BodyMap from '../components/patient/BodyMap'
import useAgentStream from '../hooks/useAgentStream'

const API = 'http://localhost:8000'

const EMPTY_FORM = {
  first_name: '', last_name: '', age: '', sex: '', country: '', region: '',
  chief_complaint: '', history: '', medications: '', allergies: '', lab_results: '', notes: '',
  blood_type: '', patient_id: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const initials = (p) => `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase()
const avatarGradient = (p) => {
  const colors = [
    ['#0f5c53','#6ec4b8'], ['#1a6b5a','#4db89a'], ['#0a4d4d','#5bb8b8'],
    ['#2d5a6b','#6bb8cc'], ['#3d5a2d','#8acc6b'],
  ]
  const idx = ((p.first_name?.charCodeAt(0) || 0) + (p.last_name?.charCodeAt(0) || 0)) % colors.length
  return colors[idx]
}

const sourceIcon = (t) => {
  if (t === 'pdf' || t === 'scanned_pdf') return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

// ── Patient ID Card (list view) ───────────────────────────────────────────────

function PatientIDCard({ patient, onClick, onDelete }) {
  const [g1, g2] = avatarGradient(patient)
  const pid = patient.patient_id || `MED-${String(patient.id).padStart(6, '0')}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl overflow-hidden border-[2px] border-teal-100 bg-white"
      style={{ boxShadow: '4px 4px 0px rgba(15,92,83,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' }}
    >
      {/* Card header strip */}
      <div className="h-2" style={{ background: `linear-gradient(90deg, ${g1}, ${g2})` }} />

      <div className="p-4 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, boxShadow: '3px 3px 0px rgba(0,0,0,0.12)' }}>
            {initials(patient) || '?'}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-teal-500 mb-0.5">Patient ID</p>
              <p className="text-[11px] font-mono font-semibold text-teal-700 mb-1">{pid}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); onDelete() }}
              className="text-gray-200 hover:text-red-400 transition-colors p-1 -mt-1 -mr-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <h3 className="font-bold text-teal-900 text-sm leading-tight">
            {patient.first_name} {patient.last_name}
          </h3>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {patient.age && (
              <span className="text-[10px] text-gray-500">
                <span className="font-medium text-gray-600">DOB</span> · {patient.age}y
              </span>
            )}
            {patient.sex && (
              <span className="text-[10px] text-gray-500">{patient.sex}</span>
            )}
            {patient.blood_type && (
              <span className="text-[10px] font-bold text-teal-600">{patient.blood_type}</span>
            )}
          </div>

          {patient.country && (
            <p className="text-[10px] text-gray-400 mt-1">{patient.country}{patient.region && `, ${patient.region}`}</p>
          )}
        </div>

        {/* QR accent */}
        <div className="flex-shrink-0 self-end">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 grid grid-cols-3 gap-0.5 p-1.5"
            style={{ boxShadow: 'inset 1px 1px 0px rgba(15,92,83,0.08)' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`rounded-sm ${[0,2,4,6,8].includes(i) ? 'bg-teal-600' : 'bg-teal-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {patient.chief_complaint && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-teal-50 border border-teal-100/80 px-3 py-1.5">
            <p className="text-[10px] text-teal-600 line-clamp-1">{patient.chief_complaint}</p>
          </div>
        </div>
      )}

      <div className="px-4 pb-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        <span className="text-[10px] text-teal-500 font-medium">Open AI chart</span>
      </div>
    </motion.div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────────

function Field({ label, name, value, onChange, type = 'text', textarea = false, half = false }) {
  return (
    <div className={half ? 'flex-1' : 'w-full'}>
      <label className="text-xs font-semibold text-teal-700 block mb-1">{label}</label>
      {textarea
        ? <textarea name={name} value={value} onChange={onChange} rows={3}
            className="input-field text-sm w-full resize-none" />
        : <input type={type} name={name} value={value} onChange={onChange}
            className="input-field text-sm w-full" />
      }
    </div>
  )
}

function PatientForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Field label="First Name" name="first_name" value={form.first_name} onChange={handle} half />
        <Field label="Last Name" name="last_name" value={form.last_name} onChange={handle} half />
      </div>
      <div className="flex gap-3">
        <Field label="Patient ID (optional)" name="patient_id" value={form.patient_id || ''} onChange={handle} half />
        <Field label="Blood Type" name="blood_type" value={form.blood_type || ''} onChange={handle} half />
      </div>
      <div className="flex gap-3">
        <Field label="Age" name="age" value={form.age} onChange={handle} type="number" half />
        <div className="flex-1">
          <label className="text-xs font-semibold text-teal-700 block mb-1">Sex</label>
          <select name="sex" value={form.sex} onChange={handle} className="input-field text-sm w-full">
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <Field label="Country" name="country" value={form.country} onChange={handle} half />
        <Field label="Region" name="region" value={form.region} onChange={handle} half />
      </div>
      <Field label="Chief Complaint" name="chief_complaint" value={form.chief_complaint} onChange={handle} textarea />
      <Field label="Medical History" name="history" value={form.history} onChange={handle} textarea />
      <div className="flex gap-3">
        <Field label="Medications" name="medications" value={form.medications} onChange={handle} textarea half />
        <Field label="Allergies" name="allergies" value={form.allergies} onChange={handle} textarea half />
      </div>
      <Field label="Lab Results" name="lab_results" value={form.lab_results} onChange={handle} textarea />
      <Field label="Notes" name="notes" value={form.notes} onChange={handle} textarea />
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save Patient'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>}
      </div>
    </form>
  )
}

// ── Chat ──────────────────────────────────────────────────────────────────────

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? 'bg-teal-700 text-white rounded-tr-sm' : 'bg-white border border-teal-100 text-gray-700 rounded-tl-sm'
      }`} style={{ boxShadow: isUser ? '2px 2px 0px rgba(0,0,0,0.12)' : '2px 2px 0px rgba(15,92,83,0.06)' }}>
        <ReactMarkdown
          components={{
            p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
            strong: ({children}) => <strong className={`font-semibold ${isUser ? 'text-teal-100' : 'text-teal-900'}`}>{children}</strong>,
            ul: ({children}) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
            li: ({children}) => <li className="leading-relaxed">{children}</li>,
            h1: ({children}) => <h1 className={`font-bold text-base mb-1 ${isUser ? 'text-white' : 'text-teal-900'}`}>{children}</h1>,
            h2: ({children}) => <h2 className={`font-bold text-sm mb-1 ${isUser ? 'text-teal-100' : 'text-teal-800'}`}>{children}</h2>,
            h3: ({children}) => <h3 className={`font-semibold text-sm mb-0.5 ${isUser ? 'text-teal-100' : 'text-teal-700'}`}>{children}</h3>,
            code: ({inline, children}) => inline
              ? <code className={`px-1 py-0.5 rounded text-xs font-mono ${isUser ? 'bg-teal-600' : 'bg-teal-50 text-teal-700'}`}>{children}</code>
              : <pre className={`p-2 rounded-lg text-xs font-mono mt-1 overflow-x-auto ${isUser ? 'bg-teal-800' : 'bg-gray-50 text-gray-700'}`}><code>{children}</code></pre>,
            hr: () => <hr className={`my-2 ${isUser ? 'border-teal-600' : 'border-teal-100'}`} />,
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  )
}

// ── Document upload ───────────────────────────────────────────────────────────

function DocumentUpload({ patientId, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()

  const handleFiles = async (files) => {
    if (!files.length) return
    setUploading(true)
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    try {
      await fetch(`${API}/patients/${patientId}/documents`, { method: 'POST', body: fd })
      onUploaded()
    } catch {}
    setUploading(false)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`rounded-xl border-[2px] border-dashed p-3 cursor-pointer transition-all text-center
        ${drag ? 'border-teal-400 bg-teal-50' : 'border-teal-200/60 hover:border-teal-400 hover:bg-teal-50/40'}`}
    >
      <input ref={inputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff" className="hidden"
        onChange={e => handleFiles(e.target.files)} />
      {uploading ? (
        <div className="flex items-center justify-center gap-2">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400"
              animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
          <span className="text-xs text-teal-600 ml-1">Ingesting with Gemini Vision + RAG...</span>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-teal-600">Drop files or click to upload</p>
          <p className="text-[10px] text-gray-400 mt-0.5">PDF · PNG · JPG — scans, lab results, ID cards, X-rays</p>
        </>
      )}
    </div>
  )
}

// ── Rare Disease Investigation Modal ─────────────────────────────────────────

const INVESTIGATION_STEPS = [
  { icon: '🔍', text: 'Extracting clinical clues from patient documents...' },
  { icon: '📚', text: 'Searching PubMed for relevant literature...' },
  { icon: '🧬', text: 'Querying Orphanet for rare disease profiles...' },
  { icon: '🌍', text: 'Analyzing WHO regional epidemiological data for Africa...' },
  { icon: '🔬', text: 'Cross-referencing symptoms with rare disease databases...' },
  { icon: '📊', text: 'Evaluating lab results and nerve conduction findings...' },
  { icon: '🏥', text: 'Consulting regional African disease prevalence data...' },
  { icon: '⚕️', text: 'Building ranked differential diagnosis...' },
  { icon: '📋', text: 'Compiling evidence and action plan...' },
]

const TOOL_META = {
  pubmed_search:   { label: 'PubMed', color: 'text-blue-700 bg-blue-50 border-blue-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
  orphanet_lookup: { label: 'Orphanet', color: 'text-purple-700 bg-purple-50 border-purple-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg> },
  web_search:      { label: 'Web Search', color: 'text-teal-700 bg-teal-50 border-teal-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
  browser:         { label: 'Browser', color: 'text-teal-700 bg-teal-50 border-teal-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg> },
  who_data:        { label: 'WHO Data', color: 'text-orange-700 bg-orange-50 border-orange-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  icd_lookup:      { label: 'ICD-11', color: 'text-gray-700 bg-gray-50 border-gray-200',
    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
}

// Each tool goes through: hidden → searching (query shown, result hidden) → done (result revealed)
// INTER_TOOL_DELAY: ms between each tool appearing
// SEARCH_DURATION: ms a tool stays in "searching" before result appears
const INTER_TOOL_DELAY = 3500
const SEARCH_DURATION = 4000

function RareDiseasePanel({ patient, onClose }) {
  const { events, report, fullReport, isRunning, error, taskUrl, startAnalysis } = useAgentStream()
  const feedRef = useRef()

  // toolStates: array of { event, phase: 'searching' | 'done' }
  const [toolStates, setToolStates] = useState([])
  const enqueueRef = useRef(false)

  useEffect(() => {
    const fd = new FormData()
    startAnalysis(fd, `http://localhost:8000/patients/${patient.id}/investigate`)
  }, [])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [events, toolStates])

  const toolEvents = events.filter(e => e.type === 'tool')

  // Drive the tool animation queue
  useEffect(() => {
    const newCount = toolEvents.length
    const currentCount = toolStates.length
    if (newCount <= currentCount || enqueueRef.current) return

    enqueueRef.current = true

    const runQueue = async (startIdx) => {
      for (let i = startIdx; i < newCount; i++) {
        // Appear in "searching" phase
        setToolStates(prev => [...prev, { event: toolEvents[i], phase: 'searching' }])
        await new Promise(r => setTimeout(r, SEARCH_DURATION))
        // Reveal result
        setToolStates(prev => prev.map((t, idx) => idx === i ? { ...t, phase: 'done' } : t))
        if (i < newCount - 1) {
          await new Promise(r => setTimeout(r, INTER_TOOL_DELAY))
        }
      }
      enqueueRef.current = false
    }

    runQueue(currentCount)
  }, [toolEvents.length])

  const agentEvents = events.filter(e => e.type === 'step')
  const differentials = fullReport?.differentials || report?.differentials || []

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="clay rounded-2xl overflow-hidden border border-teal-100"
      style={{ boxShadow: '4px 4px 0px rgba(15,92,83,0.08)' }}>

      {/* Panel header */}
      <div className="px-4 py-3 border-b border-teal-100/80 flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-teal-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-teal-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a5 5 0 01-7.072 0l-.347-.347z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-teal-900">Rare Disease Investigation</p>
          <p className="text-[10px] text-gray-400">Manus · PubMed · Orphanet · WHO</p>
        </div>
        {taskUrl && (
          <a href={taskUrl} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-teal-500 hover:text-teal-700 underline transition-colors flex-shrink-0">
            View in Manus
          </a>
        )}
        {isRunning && (
          <div className="flex gap-1 flex-shrink-0">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400"
                animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.2 }} />
            ))}
          </div>
        )}
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 ml-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable feed */}
      <div className="overflow-y-auto max-h-[420px]" ref={feedRef}>

        {/* Step log + tool calls */}
        {(agentEvents.length > 0 || toolStates.length > 0) && (
          <div className="p-4 flex flex-col gap-2 border-b border-teal-50">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-500 mb-1">
              {isRunning ? 'Agent activity' : 'Investigation log'}
            </p>

            {/* Step messages */}
            {agentEvents.map((e, i) => (
              <motion.div key={`step-${i}`} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }} className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  i === agentEvents.length - 1 && isRunning && toolStates.length === 0
                    ? 'bg-teal-400 animate-pulse' : 'bg-teal-200'
                }`} />
                <p className="text-[11px] text-gray-500 leading-relaxed">{e.message}</p>
              </motion.div>
            ))}

            {/* Tool call rows — two-phase: searching → done */}
            {toolStates.length > 0 && (
              <div className="mt-1 flex flex-col gap-1.5">
                {toolStates.map(({ event: e, phase }, i) => {
                  const meta = TOOL_META[e.data?.tool] || {
                    label: e.data?.tool || 'Search',
                    color: 'text-teal-700 bg-teal-50 border-teal-200',
                    icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  }
                  const searching = phase === 'searching'
                  return (
                    <motion.div key={`tool-${i}`}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-500 ${meta.color}`}>
                      {/* Icon — spins while searching */}
                      <span className={`flex-shrink-0 mt-0.5 opacity-80 ${searching ? 'animate-spin' : ''}`}
                        style={searching ? { animationDuration: '1.5s' } : {}}>
                        {meta.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">{meta.label}</span>
                          {searching && (
                            <span className="text-[10px] opacity-50 italic">searching...</span>
                          )}
                          {!searching && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="text-[10px] opacity-50">
                              — done
                            </motion.span>
                          )}
                        </div>
                        {e.data?.query && (
                          <p className="text-[11px] font-medium truncate">{e.data.query}</p>
                        )}
                        {/* Result slides in only after searching phase */}
                        <AnimatePresence>
                          {!searching && e.data?.result && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              transition={{ duration: 0.35 }}
                              className="text-[10px] opacity-60 mt-1 line-clamp-2 leading-relaxed">
                              {e.data.result}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4">
            <p className="text-[11px] text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          </div>
        )}

        {/* Differential diagnoses */}
        {differentials.length > 0 && (
          <div className="p-4 flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-500">Differential Diagnoses</p>

            {differentials.map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-teal-100 bg-white p-3.5"
                style={{ boxShadow: '2px 2px 0px rgba(15,92,83,0.06)' }}>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {d.rank || i+1}
                    </span>
                    <h3 className="text-xs font-bold text-teal-900">{d.name}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    (d.confidence||0) >= 0.7 ? 'bg-teal-100 text-teal-700' :
                    (d.confidence||0) >= 0.4 ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-100 text-gray-500'}`}>
                    {Math.round((d.confidence||0)*100)}%
                  </span>
                </div>
                {d.reasoning && <p className="text-[11px] text-gray-600 leading-relaxed mb-1.5">{d.reasoning}</p>}
                {d.regional_prevalence && (
                  <p className="text-[10px] text-teal-600 bg-teal-50 rounded-lg px-2 py-1 mb-1.5">{d.regional_prevalence}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {d.icd11_code && <span className="badge bg-gray-50 text-gray-500 border-gray-200 text-[10px]">ICD-11: {d.icd11_code}</span>}
                  {d.orphanet_url && (
                    <a href={d.orphanet_url} target="_blank" rel="noopener noreferrer"
                      className="badge bg-purple-50 text-purple-600 border-purple-200 text-[10px] hover:bg-purple-100 transition-colors no-underline">
                      Orphanet
                    </a>
                  )}
                </div>
              </motion.div>
            ))}

            {fullReport?.action_plan && (
              <div className="rounded-xl border border-teal-100 bg-teal-50 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-600 mb-2">Action Plan</p>
                {Object.entries(fullReport.action_plan).map(([k, v]) => (
                  <div key={k} className="mb-2 last:mb-0">
                    <p className="text-[10px] font-bold text-teal-700 uppercase mb-1">{k.replace(/_/g,' ')}</p>
                    {Array.isArray(v)
                      ? v.map((item, j) => <p key={j} className="text-[11px] text-teal-800 ml-2">— {item}</p>)
                      : <p className="text-[11px] text-teal-800 ml-2">{v}</p>
                    }
                  </div>
                ))}
              </div>
            )}

            {fullReport?.who_context && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 mb-1">WHO / Regional Context</p>
                <p className="text-[11px] text-blue-800 leading-relaxed">{fullReport.who_context}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Patient detail view ───────────────────────────────────────────────────────

function PatientDetail({ patient, onBack, onUpdated }) {
  const [messages, setMessages] = useState(patient.messages || [])
  const [documents, setDocuments] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bodyMapKey, setBodyMapKey] = useState(0)
  const [showRareDisease, setShowRareDisease] = useState(false)
  const bottomRef = useRef()
  const [g1, g2] = avatarGradient(patient)
  const pid = patient.patient_id || `MED-${String(patient.id).padStart(6, '0')}`

  const loadDocs = () => {
    fetch(`${API}/patients/${patient.id}/documents`)
      .then(r => r.json()).then(d => setDocuments(d.documents || []))
  }
  useEffect(() => { loadDocs() }, [])

  // Called when user clicks a body part on the map — fills input only
  const handleBodyPartClick = (slug, label, reason) => {
    let msg = `Tell me about the ${label} findings for this patient.`
    if (reason) msg += ` (${reason})`
    setInput(msg)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamBuffer])

  const sendMessageText = async (text) => {
    if (!text?.trim() || streaming) return
    const userMsg = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamBuffer('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      const resp = await fetch(`${API}/patients/${patient.id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content })
      })
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buf = '', full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.chunk) { full += d.chunk; setStreamBuffer(full) }
            if (d.done) { setMessages(prev => [...prev, { role: 'assistant', content: full }]); setStreamBuffer(''); setStreaming(false) }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
      setStreaming(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || streaming) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamBuffer('')
    try {
      const resp = await fetch(`${API}/patients/${patient.id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content })
      })
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buf = '', full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.chunk) { full += d.chunk; setStreamBuffer(full) }
            if (d.done) { setMessages(prev => [...prev, { role: 'assistant', content: full }]); setStreamBuffer(''); setStreaming(false) }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
      setStreaming(false)
    }
  }

  const handleUpdate = async (form) => {
    setSaving(true)
    await fetch(`${API}/patients/${patient.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, age: form.age ? parseInt(form.age) : null })
    })
    setSaving(false); setEditing(false); onUpdated()
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ID Card header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden border-[2px] border-teal-100 bg-white flex-shrink-0"
        style={{ boxShadow: '4px 4px 0px rgba(15,92,83,0.10)' }}>
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${g1}, ${g2})` }} />
        <div className="p-5 flex gap-5 items-center">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, boxShadow: '3px 3px 0px rgba(0,0,0,0.12)' }}>
            {initials(patient) || '?'}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-teal-400">{pid}</p>
            <h2 className="text-lg font-bold text-teal-900 leading-tight">{patient.first_name} {patient.last_name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {patient.age && <span className="text-xs text-gray-500"><span className="font-semibold text-gray-600">Age</span> {patient.age}</span>}
              {patient.sex && <span className="text-xs text-gray-500">{patient.sex}</span>}
              {patient.blood_type && <span className="text-xs font-bold text-teal-600">{patient.blood_type}</span>}
              {patient.country && <span className="text-xs text-gray-400">{patient.country}{patient.region && `, ${patient.region}`}</span>}
            </div>
          </div>

          {/* QR accent */}
          <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 grid grid-cols-3 gap-0.5 p-1.5 flex-shrink-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`rounded-sm ${[0,2,4,6,8].includes(i) ? 'bg-teal-600' : 'bg-teal-200'}`} />
            ))}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onBack} className="btn-ghost text-xs py-1.5 px-3">Back</button>
            <button onClick={() => setEditing(e => !e)} className="btn-ghost text-xs py-1.5 px-3">
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={() => setShowRareDisease(v => !v)}
              className={`text-xs py-1.5 px-4 flex items-center gap-1.5 rounded-xl font-semibold transition-all ${
                showRareDisease ? 'bg-teal-100 text-teal-700 border border-teal-200 hover:bg-teal-200' : 'btn-primary'
              }`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a5 5 0 01-7.072 0l-.347-.347z" />
              </svg>
              {showRareDisease ? 'Back to Chat' : 'Investigate Rare Disease'}
            </button>
          </div>
        </div>
      </motion.div>

      {editing ? (
        <div className="flex-1 overflow-y-auto clay p-6">
          <PatientForm initial={{ ...patient, age: patient.age?.toString() || '', patient_id: patient.patient_id || '', blood_type: patient.blood_type || '' }}
            onSave={handleUpdate} onCancel={() => setEditing(false)} saving={saving} />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-4">
          {/* Left: info + docs */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            {/* Clinical summary */}
            <div className="clay-teal p-4 rounded-2xl">
              <p className="section-label">Clinical Summary</p>
              {patient.chief_complaint && (
                <div className="mb-2">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-teal-500 mb-0.5">Chief Complaint</p>
                  <p className="text-xs text-teal-800 leading-relaxed">{patient.chief_complaint}</p>
                </div>
              )}
              {patient.history && (
                <div className="mb-2">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-teal-500 mb-0.5">History</p>
                  <p className="text-xs text-teal-800 leading-relaxed line-clamp-3">{patient.history}</p>
                </div>
              )}
              {patient.medications && (
                <div className="mb-2">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-teal-500 mb-0.5">Medications</p>
                  <p className="text-xs text-teal-700">{patient.medications}</p>
                </div>
              )}
              {patient.allergies && (
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-red-400 mb-0.5">Allergies</p>
                  <p className="text-xs text-red-600 font-medium">{patient.allergies}</p>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="clay p-4 rounded-2xl">
              <p className="section-label">Documents ({documents.length})</p>
              <DocumentUpload patientId={patient.id} onUploaded={() => { loadDocs(); setBodyMapKey(k => k + 1) }} />
              {documents.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-100 px-2.5 py-1.5">
                      <span className="text-teal-500 flex-shrink-0">{sourceIcon(doc.source_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-teal-800 truncate">{doc.filename}</p>
                        <p className="text-[9px] text-gray-400">{doc.chunks} chunks · {doc.source_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lab results */}
            {patient.lab_results && (
              <div className="clay p-4 rounded-2xl">
                <p className="section-label">Lab Results</p>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{patient.lab_results}</p>
              </div>
            )}

            {/* Body Map */}
            <div className="clay p-4 rounded-2xl">
              <BodyMap
                key={bodyMapKey}
                patient={patient}
                patientId={patient.id}
                onPartClick={handleBodyPartClick}
              />
            </div>
          </div>

          {/* Right: investigation panel or AI chat */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <AnimatePresence mode="wait">
              {showRareDisease ? (
                <motion.div key="panel" className="flex-1 overflow-hidden min-h-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <RareDiseasePanel patient={patient} onClose={() => setShowRareDisease(false)} />
                </motion.div>
              ) : (
                <motion.div key="chat" className="flex-1 flex flex-col clay overflow-hidden min-h-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="px-4 py-3 border-b border-teal-100/80 flex-shrink-0 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-600">AI Clinical Assistant</span>
                    <span className="text-[10px] text-gray-400 ml-auto">Gemini 2.5 · RAG {documents.length > 0 ? `· ${documents.length} docs` : ''}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                    {messages.length === 0 && !streaming && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <p className="text-sm text-gray-400 mb-3">Ask anything about this patient</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {["Summarize this case", "Suggest differentials", "Any drug interactions?", "What tests should I order?"].map(q => (
                            <button key={q} onClick={() => sendMessageText(q)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-100 text-teal-600 hover:bg-teal-100 transition-colors">
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
                    {streaming && streamBuffer && <ChatBubble msg={{ role: 'assistant', content: streamBuffer }} />}
                    {streaming && !streamBuffer && (
                      <div className="flex gap-1.5 px-2">
                        {[0,1,2].map(i => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400"
                            animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                        ))}
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="px-4 py-3 border-t border-teal-100/80 flex-shrink-0 flex gap-2">
                    <input className="input-field text-sm flex-1" placeholder="Ask about this patient..."
                      value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} disabled={streaming} />
                    <button onClick={sendMessage} disabled={streaming || !input.trim()} className="btn-primary px-4 py-2 text-sm">Send</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch(`${API}/patients`).then(r => r.json())
      .then(d => { setPatients(d.patients || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const loadPatient = async (id) => {
    const r = await fetch(`${API}/patients/${id}`)
    setSelected(await r.json())
  }

  const handleCreate = async (form) => {
    setSaving(true)
    await fetch(`${API}/patients`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, age: form.age ? parseInt(form.age) : null })
    })
    setSaving(false); setShowForm(false); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this patient and all their documents?')) return
    await fetch(`${API}/patients/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="relative min-h-screen pt-16 pb-12 px-4">
      <div className="blob w-96 h-96 bg-teal-300 -top-20 -left-20" />
      <div className="blob w-64 h-64 bg-teal-400 bottom-10 right-0" style={{ animationDelay: '4s' }} />

      <div className="relative z-10 max-w-6xl mx-auto pt-8">
        {selected ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-7rem)]">
            <PatientDetail patient={selected} onBack={() => { setSelected(null); load() }}
              onUpdated={() => loadPatient(selected.id)} />
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="pb-6 flex items-end justify-between">
              <div>
                <p className="section-label">Registry</p>
                <h1 className="text-2xl font-bold text-teal-900">Patients</h1>
                <p className="text-sm text-gray-500 mt-1">{patients.length} patients on record</p>
              </div>
              <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm">
                {showForm ? 'Cancel' : '+ New Patient'}
              </button>
            </motion.div>

            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                  <div className="clay p-6">
                    <p className="section-label mb-4">New Patient</p>
                    <PatientForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-teal-400"
                      animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            )}

            {!loading && patients.length === 0 && !showForm && (
              <div className="clay p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center mx-auto mb-3"
                  style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.08)' }}>
                  <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 mb-4">No patients yet.</p>
                <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-5">Add First Patient</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((p, i) => (
                <PatientIDCard key={p.id} patient={p}
                  onClick={() => loadPatient(p.id)}
                  onDelete={() => handleDelete(p.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
