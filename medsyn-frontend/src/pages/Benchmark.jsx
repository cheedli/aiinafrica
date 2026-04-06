import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAgentStream from '../hooks/useAgentStream'

const API = 'http://localhost:8000'

const DIFF_COLORS = {
  hard:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  easy:   'bg-teal-50 text-teal-600 border-teal-200',
}

// ── Semantic disease name matching ────────────────────────────────────────────

// Strip noise words, punctuation, roman numerals — return sorted key word set
const STOP_WORDS = new Set([
  'disease', 'syndrome', 'disorder', 'type', 'stage', 'acute', 'chronic',
  'congenital', 'primary', 'secondary', 'familial', 'adult', 'juvenile',
  'onset', 'with', 'and', 'the', 'of', 'in', 'a', 'an',
])

function keyWords(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
}

// Jaccard similarity on key word sets
function nameSimilarity(a, b) {
  const sa = new Set(keyWords(a))
  const sb = new Set(keyWords(b))
  if (sa.size === 0 || sb.size === 0) return 0
  const intersection = [...sa].filter(w => sb.has(w)).length
  const union = new Set([...sa, ...sb]).size
  return intersection / union
}

// Returns true if the two disease names refer to the same condition
function nameMatches(aiName, groundTruth) {
  if (!aiName || !groundTruth) return false
  const sim = nameSimilarity(aiName, groundTruth)
  if (sim >= 0.4) return true  // 40% keyword overlap → same disease
  // Fallback: ground truth key words are a subset of AI name or vice-versa
  const gt = keyWords(groundTruth)
  const ai = keyWords(aiName)
  const gtInAi = gt.filter(w => ai.includes(w)).length
  const aiInGt = ai.filter(w => gt.includes(w)).length
  if (gt.length > 0 && gtInAi / gt.length >= 0.6) return true
  if (ai.length > 0 && aiInGt / ai.length >= 0.6) return true
  return false
}

// ── Score a single investigation result against the ground truth ───────────────

function scoreResult(aiDifferentials, correctDiagnosis, expectedDifferentials) {
  if (!aiDifferentials || aiDifferentials.length === 0) return null

  const rank1Match = nameMatches(aiDifferentials[0]?.name, correctDiagnosis)
  const top3Match = !rank1Match && aiDifferentials.slice(0, 3).some(d => nameMatches(d.name, correctDiagnosis))
  const anyMatch = !rank1Match && !top3Match && aiDifferentials.some(d => nameMatches(d.name, correctDiagnosis))

  // Partial credit: how many expected differentials appear
  const expectedMatched = expectedDifferentials.filter(exp =>
    aiDifferentials.some(d => nameMatches(d.name, exp))
  )

  let score = 0
  let verdict = 'miss'
  if (rank1Match) { score = 100; verdict = 'exact' }
  else if (top3Match) { score = 70; verdict = 'top3' }
  else if (anyMatch) { score = 40; verdict = 'found' }
  else { score = Math.round((expectedMatched.length / Math.max(expectedDifferentials.length, 1)) * 30); verdict = 'miss' }

  return { score, verdict, rank1Match, top3Match, anyMatch, expectedMatched }
}

// Helper exposed for the differential highlight check
function isDxMatch(aiName, correctDiagnosis) {
  return nameMatches(aiName, correctDiagnosis)
}

// ── Verdict badge — professional clinical confidence labels ───────────────────

const VERDICT_CFG = {
  exact: { label: 'Confirmed Diagnosis',  sub: 'Ranked #1',           cls: 'bg-teal-100 text-teal-700 border-teal-300' },
  top3:  { label: 'Strong Suspicion',     sub: 'In top 3',            cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  found: { label: 'Considered',           sub: 'Not prioritised',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  miss:  { label: 'Not Identified',       sub: 'Outside differentials', cls: 'bg-red-100 text-red-600 border-red-200' },
}

function VerdictBadge({ verdict }) {
  const cfg = VERDICT_CFG[verdict] || { label: 'Pending', sub: '', cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${cfg.cls}`}>
      {verdict === 'exact' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
      {verdict === 'miss'  && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>}
      {verdict === 'top3'  && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
      {verdict === 'found' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      <span>{cfg.label}</span>
      <span className="opacity-60 font-normal">· {cfg.sub}</span>
    </span>
  )
}

// ── Single benchmark case row ──────────────────────────────────────────────────

const TOOL_ICONS = {
  pubmed_search:   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  orphanet_lookup: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>,
  web_search:      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  browser:         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>,
  who_data:        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  icd_lookup:      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
}

const TOOL_LABELS = {
  pubmed_search: 'PubMed', orphanet_lookup: 'Orphanet',
  web_search: 'Web', browser: 'Browser', who_data: 'WHO', icd_lookup: 'ICD-11',
}

async function saveToDb(entry, data) {
  try {
    await fetch(`${API}/benchmark/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: entry.case_id,
        patient_id: entry.patient_id,
        verdict: data.verdict,
        score: data.score,
        differentials: data.differentials || [],
        tools: data.tools || [],
        full_report: data.fullReport || {},
      })
    })
  } catch {}
}

function BenchmarkCase({ entry, index, onResult, savedResult }) {
  const { events, report, fullReport, isRunning, error, startAnalysis } = useAgentStream()
  const [status, setStatus] = useState(savedResult ? 'done' : 'idle')
  const [result, setResult] = useState(savedResult || null)
  const [expanded, setExpanded] = useState(false)
  const feedRef = useRef()

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [events])

  useEffect(() => {
    if (fullReport?.differentials && status === 'running') {
      const scored = scoreResult(fullReport.differentials, entry.correct_diagnosis, entry.expected_differentials)
      const toolEvents = events.filter(e => e.type === 'tool').map(e => e.data)
      const data = { ...scored, differentials: fullReport.differentials, fullReport, tools: toolEvents }
      setResult(data)
      setStatus('done')
      onResult(entry.case_id, scored)
      saveToDb(entry, data)
    }
  }, [fullReport])

  useEffect(() => {
    if (error && status === 'running') setStatus('error')
  }, [error])

  // Notify parent of saved results on mount
  useEffect(() => {
    if (savedResult) onResult(entry.case_id, savedResult)
  }, [])

  const runInvestigation = () => {
    setStatus('running')
    setResult(null)
    const fd = new FormData()
    startAnalysis(fd, `${API}/patients/${entry.patient_id}/investigate`)
  }

  const stepEvents = events.filter(e => e.type === 'step')
  const liveToolEvents = events.filter(e => e.type === 'tool')
  const aiTop1 = result?.differentials?.[0]
  // Use saved tools if available, else live stream
  const toolsToShow = result?.tools?.length ? result.tools : liveToolEvents.map(e => e.data)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="clay rounded-2xl overflow-hidden border border-teal-100"
      style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.07)' }}>

      {/* Case header */}
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}>

        {/* Index */}
        <span className="w-7 h-7 rounded-lg bg-teal-700 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>

        {/* Case info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-teal-900">{entry.patient_name}</p>
            <span className="text-[10px] text-gray-400">{entry.country} · {entry.case_id}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${DIFF_COLORS[entry.difficulty]}`}>
              {entry.difficulty}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            Wrong dx: <span className="text-red-500 font-medium">{entry.wrong_diagnosis}</span>
            <span className="mx-1.5 text-gray-300">→</span>
            Correct: <span className="text-teal-700 font-medium">{entry.correct_diagnosis}</span>
          </p>
          {entry.diagnosis_delay && (
            <p className="text-[10px] text-amber-600 mt-0.5">
              Real-world delay: <span className="font-semibold">{entry.diagnosis_delay}</span>
            </p>
          )}
        </div>

        {/* Status / verdict */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'idle' && (
            <button onClick={e => { e.stopPropagation(); runInvestigation() }}
              className="btn-primary text-[11px] py-1.5 px-3">
              Run
            </button>
          )}
          {status === 'running' && (
            <div className="flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400"
                  animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.2 }} />
              ))}
              <span className="text-[10px] text-gray-400 ml-1">Investigating...</span>
            </div>
          )}
          {status === 'done' && result && <VerdictBadge verdict={result.verdict} />}
          {status === 'error' && (
            <span className="text-[10px] text-red-500">Error — retry</span>
          )}
          {status !== 'idle' && (
            <button onClick={e => { e.stopPropagation(); runInvestigation() }}
              className="text-[10px] text-gray-400 hover:text-teal-600 transition-colors ml-1">
              {status === 'done' || status === 'error' ? 'Retry' : ''}
            </button>
          )}
          {/* Expand chevron */}
          <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="border-t border-teal-50 overflow-hidden">
            <div className="p-4 flex flex-col gap-4">

              {/* Two-column: ground truth left, AI output right */}
              <div className="grid grid-cols-2 gap-4">

                {/* Ground truth */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ground Truth</p>

                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase text-red-400 mb-0.5">Initial Wrong Dx</p>
                    <p className="text-xs font-semibold text-red-700">{entry.wrong_diagnosis}</p>
                  </div>

                  <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase text-teal-500 mb-0.5">Correct Diagnosis</p>
                    <p className="text-xs font-bold text-teal-800">{entry.correct_diagnosis}</p>
                    {entry.correct_orpha && (
                      <p className="text-[9px] text-teal-600 mt-0.5">{entry.correct_orpha} · {entry.correct_icd11}</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Key Clues</p>
                    {entry.key_clues.map((c, i) => (
                      <p key={i} className="text-[10px] text-gray-600 mb-0.5">· {c}</p>
                    ))}
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase text-amber-500 mb-1">Red Herrings</p>
                    {entry.red_herrings.map((r, i) => (
                      <p key={i} className="text-[10px] text-amber-700 mb-0.5">· {r}</p>
                    ))}
                  </div>
                </div>

                {/* AI output */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">MedSyn Output</p>

                  {status === 'idle' && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-6 flex items-center justify-center">
                      <p className="text-[11px] text-gray-400">Click Run to investigate</p>
                    </div>
                  )}

                  {status === 'running' && (
                    <div className="rounded-xl border border-teal-100 bg-white px-3 py-2 max-h-52 overflow-y-auto" ref={feedRef}>
                      <p className="text-[9px] font-bold uppercase text-teal-500 mb-1.5">Live feed</p>
                      {stepEvents.map((e, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1">
                          <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${
                            i === stepEvents.length - 1 ? 'bg-teal-400 animate-pulse' : 'bg-teal-200'
                          }`} />
                          <p className="text-[10px] text-gray-500 leading-relaxed">{e.message}</p>
                        </div>
                      ))}
                      {liveToolEvents.map((e, i) => {
                        const tool = e.data?.tool || 'search'
                        const icon = TOOL_ICONS[tool] || TOOL_ICONS.web_search
                        const label = TOOL_LABELS[tool] || tool
                        return (
                          <div key={`t${i}`} className="flex items-start gap-1.5 mb-1 bg-teal-50 rounded-lg px-2 py-1">
                            <span className="text-teal-500 flex-shrink-0 mt-0.5">{icon}</span>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-teal-600 uppercase mr-1">{label}</span>
                              <span className="text-[10px] text-gray-600 truncate">{e.data?.query || e.data?.url || ''}</span>
                            </div>
                          </div>
                        )
                      })}
                      {stepEvents.length === 0 && liveToolEvents.length === 0 && (
                        <p className="text-[10px] text-gray-400">Connecting to Manus...</p>
                      )}
                    </div>
                  )}

                  {(status === 'done' || status === 'error') && result && (
                    <>
                      {/* Score summary */}
                      <div className={`rounded-xl border px-3 py-2 ${
                        result.verdict === 'exact' ? 'border-teal-200 bg-teal-50' :
                        result.verdict === 'top3' ? 'border-blue-200 bg-blue-50' :
                        result.verdict === 'found' ? 'border-amber-200 bg-amber-50' :
                        'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[9px] font-bold uppercase text-gray-400">AI Top Differential</p>
                          <VerdictBadge verdict={result.verdict} />
                        </div>
                        {aiTop1 && (
                          <p className="text-xs font-bold text-gray-800">{aiTop1.name}</p>
                        )}
                        {aiTop1?.confidence && (
                          <p className="text-[10px] text-gray-500">{Math.round(aiTop1.confidence * 100)}% confidence</p>
                        )}
                      </div>

                      {/* All differentials */}
                      <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                        <p className="text-[9px] font-bold uppercase text-gray-400 mb-1.5">All Differentials</p>
                        {result.differentials.map((d, i) => {
                          const isCorrect = isDxMatch(d.name, entry.correct_diagnosis)
                          return (
                            <div key={i} className={`flex items-center gap-2 mb-1 rounded-lg px-2 py-1 ${
                              isCorrect ? 'bg-teal-50 border border-teal-200' : ''
                            }`}>
                              <span className="w-4 h-4 rounded-full bg-teal-700 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                {d.rank || i+1}
                              </span>
                              <p className={`text-[10px] flex-1 ${isCorrect ? 'font-bold text-teal-800' : 'text-gray-600'}`}>
                                {d.name}
                                {isCorrect && <span className="ml-1 text-teal-500">✓</span>}
                              </p>
                              <span className="text-[9px] text-gray-400">
                                {Math.round((d.confidence||0)*100)}%
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Tools used */}
                      {toolsToShow.length > 0 && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase text-gray-400 mb-1.5">Tools used ({toolsToShow.length})</p>
                          <div className="flex flex-col gap-1">
                            {toolsToShow.map((t, i) => {
                              const tool = t?.tool || 'search'
                              const icon = TOOL_ICONS[tool] || TOOL_ICONS.web_search
                              const label = TOOL_LABELS[tool] || tool
                              return (
                                <div key={i} className="flex items-start gap-1.5">
                                  <span className="text-teal-500 flex-shrink-0 mt-0.5">{icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-bold text-teal-600 uppercase mr-1">{label}</span>
                                    <span className="text-[10px] text-gray-500 break-words">{t?.query || t?.url || ''}</span>
                                    {t?.result && <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">{t.result}</p>}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Regional context */}
                      {result.fullReport?.who_context && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                          <p className="text-[9px] font-bold uppercase text-blue-400 mb-1">WHO / Regional</p>
                          <p className="text-[10px] text-blue-700 leading-relaxed">{result.fullReport.who_context}</p>
                        </div>
                      )}
                    </>
                  )}

                  {status === 'error' && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                      <p className="text-[10px] text-red-500">{error}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ground truth reasoning */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Clinical Reasoning (Ground Truth)</p>
                <p className="text-[10px] text-gray-600 leading-relaxed">{entry.correct_reasoning}</p>
              </div>

              {/* Source reference */}
              <div className="flex items-start justify-between gap-4">
                <p className="text-[9px] text-gray-400 italic flex-1">{entry.source}</p>
                {entry.source_url && (
                  <a href={entry.source_url} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-medium text-teal-600 hover:text-teal-800 transition-colors no-underline bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {entry.source_journal?.split(',')[0] || 'View Source'}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Score summary bar ──────────────────────────────────────────────────────────

function ScoreSummary({ results, total }) {
  const completed = Object.keys(results).length
  const scores = Object.values(results)
  const exact   = scores.filter(r => r.verdict === 'exact').length
  const top3    = scores.filter(r => r.verdict === 'top3').length
  const found   = scores.filter(r => r.verdict === 'found').length
  const missed  = scores.filter(r => r.verdict === 'miss').length
  const detectionRate = completed ? Math.round(((exact + top3) / completed) * 100) : 0

  return (
    <div className="clay rounded-2xl p-5 border border-teal-100 mb-6"
      style={{ boxShadow: '4px 4px 0px rgba(15,92,83,0.08)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-500 mb-0.5">Diagnostic Performance</p>
          <p className="text-xs text-gray-400">{completed}/{total} cases investigated</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-teal-800">{detectionRate}<span className="text-lg text-gray-400 font-normal">%</span></p>
          <p className="text-[10px] text-gray-400">strong suspicion rate (top 3)</p>
        </div>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <motion.div className="h-full bg-teal-500 rounded-full"
          initial={{ width: 0 }} animate={{ width: `${detectionRate}%` }} transition={{ duration: 0.6 }} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Confirmed Diagnosis', sub: 'Ranked #1',            val: exact,  cls: 'text-teal-700 bg-teal-50 border-teal-200' },
          { label: 'Strong Suspicion',    sub: 'In top 3',             val: top3,   cls: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Considered',          sub: 'Not prioritised',      val: found,  cls: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Not Identified',      sub: 'Outside differentials',val: missed, cls: 'text-red-600 bg-red-50 border-red-200' },
        ].map(({ label, sub, val, cls }) => (
          <div key={label} className={`rounded-xl border px-3 py-2.5 text-center ${cls}`}>
            <p className="text-2xl font-black">{val}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5">{label}</p>
            <p className="text-[8px] opacity-50">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Benchmark page ────────────────────────────────────────────────────────

export default function Benchmark() {
  const [entries, setEntries] = useState([])
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [saved, setSaved] = useState({})

  useEffect(() => {
    Promise.all([
      fetch('/benchmark_map.json').then(r => r.json()),
      fetch(`${API}/benchmark/results`).then(r => r.json()),
    ]).then(([map, dbData]) => {
      setEntries(map)
      // Index by case_id for fast lookup
      const indexed = {}
      for (const r of (dbData.results || [])) {
        indexed[r.case_id] = {
          verdict: r.verdict,
          score: r.score,
          differentials: r.differentials,
          tools: r.tools,
          fullReport: r.full_report,
        }
      }
      setSaved(indexed)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const clearSaved = async () => {
    await fetch(`${API}/benchmark/results`, { method: 'DELETE' })
    setSaved({})
    setResults({})
  }

  const handleResult = (caseId, scored) => {
    setResults(prev => ({ ...prev, [caseId]: scored }))
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.difficulty === filter)

  if (loading) return (
    <div className="pt-28 flex items-center justify-center min-h-screen">
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-teal-400"
            animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.2 }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="pt-28 pb-12 px-6 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-teal-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black text-teal-900">Diagnostic Benchmark</h1>
            <p className="text-[11px] text-gray-400">
              {entries.length} real African clinical cases · AI investigates blind · scored against ground truth
            </p>
          </div>
        </div>
      </div>

      {/* Score summary */}
      <ScoreSummary results={results} total={entries.length} />

      {/* Filters + clear */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Filter:</span>
        {['all', 'hard', 'medium', 'easy'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11px] px-3 py-1 rounded-lg border font-medium transition-all ${
              filter === f
                ? 'bg-teal-700 text-white border-teal-700'
                : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'
            }`}>
            {f === 'all' ? `All (${entries.length})` : `${f.charAt(0).toUpperCase()+f.slice(1)} (${entries.filter(e=>e.difficulty===f).length})`}
          </button>
        ))}
        {Object.keys(saved).length > 0 && (
          <button onClick={clearSaved}
            className="ml-auto text-[11px] px-3 py-1 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-all">
            Clear saved results
          </button>
        )}
      </div>

      {/* Cases list */}
      <div className="flex flex-col gap-3">
        {filtered.map((entry, i) => (
          <BenchmarkCase
            key={entry.case_id}
            entry={entry}
            index={i}
            onResult={handleResult}
            savedResult={saved[entry.case_id] || null}
          />
        ))}
      </div>
    </div>
  )
}
