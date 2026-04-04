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
    <div className="h-screen flex flex-col bg-surface overflow-hidden pt-14">
      {/* Top bar */}
      <div className="bg-white border-b border-teal-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost text-xs py-1.5 px-3"
          >
            Back
          </button>
          <div className="h-4 w-px bg-teal-100" />
          <span className="text-sm font-semibold text-teal-900">Manus Investigation</span>
          {report.language && (
            <span className="badge bg-teal-100 text-teal-700">{report.language}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.div
                key="live"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">Live</span>
              </motion.div>
            )}
            {!isRunning && events.length > 0 && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-xs font-medium text-teal-700">Complete</span>
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-xs text-gray-400">{events.length} steps</span>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700 font-medium">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split view */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[2fr_3fr] min-h-0">
        {/* Left: Agent feed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-r border-teal-100 overflow-hidden flex flex-col bg-teal-950"
        >
          <AgentFeed events={events} isRunning={isRunning} />
        </motion.div>

        {/* Right: Report */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="overflow-hidden flex flex-col bg-white"
        >
          <ReportPanel report={report} fullReport={fullReport} />
        </motion.div>
      </div>
    </div>
  )
}
