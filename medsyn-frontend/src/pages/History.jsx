import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'

const API = 'http://localhost:8000'

const confidenceColor = (c) => {
  if (c >= 0.75) return 'text-emerald-600 bg-emerald-50 border-emerald-200/50'
  if (c >= 0.5)  return 'text-amber-600 bg-amber-50 border-amber-200/50'
  return 'text-orange-600 bg-orange-50 border-orange-200/50'
}

const langFlag = (lang) => {
  if (!lang) return ''
  const l = lang.toLowerCase()
  if (l.includes('arabic') || l.includes('arab')) return 'AR'
  if (l.includes('french') || l.includes('français')) return 'FR'
  return 'EN'
}

function InvestigationModal({ id, onClose }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`${API}/history/${id}`)
      .then(r => r.json())
      .then(setData)
  }, [id])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,40,36,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="clay w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {!data ? (
          <div className="p-8 flex justify-center">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-teal-400"
                  animate={{ opacity: [0.3,1,0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="section-label">Investigation Report</p>
                <p className="text-xs text-gray-400">{new Date(data.created_at).toLocaleString()}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="clay-teal p-4 mb-4">
              <p className="text-sm text-teal-800 leading-relaxed">{data.full_report?.patient_summary}</p>
            </div>

            <p className="section-label">Differential Diagnoses</p>
            <div className="flex flex-col gap-2 mb-4">
              {data.full_report?.differentials?.map((d, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-teal-100 bg-white px-4 py-2.5"
                  style={{ boxShadow: '2px 2px 0px rgba(15,92,83,0.06)' }}>
                  <span className="w-5 h-5 rounded-md bg-teal-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {d.rank}
                  </span>
                  <span className="text-sm font-medium text-teal-900 flex-1">{d.name}</span>
                  <span className={`badge text-xs ${confidenceColor(d.confidence)}`}>
                    {Math.round(d.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>

            {data.full_report?.action_plan && (
              <>
                <p className="section-label">Action Plan</p>
                <div className="clay-sage p-4 mb-4">
                  <p className="text-xs font-semibold text-teal-700 mb-1.5">Tests to Order</p>
                  <ul className="flex flex-col gap-1">
                    {data.full_report.action_plan.tests_to_order?.map((t, i) => (
                      <li key={i} className="text-xs text-teal-800 flex items-start gap-1.5">
                        <span className="text-teal-400 mt-0.5">—</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function History() {
  const [investigations, setInvestigations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    fetch(`${API}/history`)
      .then(r => r.json())
      .then(d => { setInvestigations(d.investigations || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="relative min-h-screen pt-16 pb-12 px-4">
      <div className="blob w-80 h-80 bg-teal-300 top-10 -left-20" />
      <div className="blob w-64 h-64 bg-teal-400 bottom-10 right-0" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6 flex items-end justify-between">
          <div>
            <p className="section-label">Records</p>
            <h1 className="text-2xl font-bold text-teal-900">Investigation History</h1>
            <p className="text-sm text-gray-500 mt-1">{investigations.length} cases on record</p>
          </div>
          <Link to="/" className="btn-primary text-sm no-underline">New Case</Link>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-teal-400"
                  animate={{ opacity: [0.3,1,0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </div>
          </div>
        )}

        {!loading && investigations.length === 0 && (
          <div className="clay p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center mx-auto mb-3"
              style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.08)' }}>
              <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-4">No investigations yet.</p>
            <Link to="/" className="btn-primary text-sm py-2 px-5 inline-block no-underline">Run First Investigation</Link>
          </div>
        )}

        {investigations.length > 0 && (
          <div className="flex flex-col gap-3">
            {investigations.map((inv, i) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setSelectedId(inv.id)}
                className="clay px-5 py-4 cursor-pointer hover:-translate-y-0.5 transition-transform duration-150 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0"
                  style={{ boxShadow: '2px 2px 0px rgba(15,92,83,0.08)' }}>
                  <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-teal-900 truncate">{inv.top_diagnosis}</p>
                    <span className={`badge text-[10px] flex-shrink-0 ${confidenceColor(inv.top_confidence)}`}>
                      {Math.round(inv.top_confidence * 100)}%
                    </span>
                    <span className="badge bg-teal-50 text-teal-600 border-teal-100 text-[10px] flex-shrink-0">
                      {langFlag(inv.detected_language)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{inv.patient_summary}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-300">{new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                <svg className="w-4 h-4 text-teal-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedId && <InvestigationModal id={selectedId} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </div>
  )
}
