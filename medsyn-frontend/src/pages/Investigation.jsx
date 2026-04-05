import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AgentFeed from '../components/investigation/AgentFeed'
import ReportPanel from '../components/report/ReportPanel'
import useAgentStream from '../hooks/useAgentStream'

export default function Investigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { text, pdfs, images } = location.state || {}
  const { events, report, fullReport, isRunning, error, startAnalysis } = useAgentStream()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!text && !pdfs?.length && !images?.length) { navigate('/'); return }
    const formData = new FormData()
    if (text) formData.append('text', text)
    if (pdfs) pdfs.forEach(f => formData.append('pdfs', f))
    if (images) images.forEach(f => formData.append('images', f))
    startAnalysis(formData)
  }, [])

  return (
    <div className="relative h-screen flex flex-col overflow-hidden pt-16">
      {/* Background blobs */}
      <div className="blob w-96 h-96 bg-teal-300 -top-20 -left-20" />
      <div className="blob w-80 h-80 bg-teal-400 bottom-0 right-0" style={{ animationDelay: '4s' }} />

      {/* Top bar */}
      <div className="relative z-10 px-4 py-3 flex-shrink-0">
        <div className="clay px-5 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <motion.button onClick={() => navigate('/')} className="btn-ghost text-xs py-1.5 px-3" whileTap={{ scale: 0.97 }}>
              Back
            </motion.button>
            <div className="h-4 w-px bg-teal-100" />
            <span className="text-sm font-semibold text-teal-900">Manus Investigation</span>
            {report.language && (
              <span className="badge bg-teal-100 text-teal-700 border-teal-200/50">{report.language}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {isRunning && (
                <motion.div key="live" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 badge bg-emerald-100 text-emerald-700 border-emerald-200/50 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </motion.div>
              )}
              {!isRunning && events.length > 0 && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="badge bg-teal-100 text-teal-700 border-teal-200/50 py-1">
                  Complete
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-xs text-gray-400">{events.length} steps</span>
          </div>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden flex-shrink-0 px-4 pb-2 relative z-10">
            <div className="clay-red px-5 py-2.5 text-sm text-red-700 font-medium max-w-7xl mx-auto">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split view */}
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4 px-4 pb-4 min-h-0 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="clay-dark overflow-hidden flex flex-col min-h-0"
        >
          <AgentFeed events={events} isRunning={isRunning} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="clay overflow-hidden flex flex-col min-h-0"
        >
          <ReportPanel report={report} fullReport={fullReport} />
        </motion.div>
      </div>
    </div>
  )
}
