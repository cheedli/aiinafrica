import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AgentFeed from '../components/investigation/AgentFeed'
import ReportPanel from '../components/report/ReportPanel'
import useAgentStream from '../hooks/useAgentStream'
import ClayCard from '../components/ui/ClayCard'

export default function Investigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { text, pdfs, images } = location.state || {}
  const { events, report, fullReport, isRunning, error, startAnalysis } = useAgentStream()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!text && !pdfs?.length && !images?.length) {
      navigate('/')
      return
    }

    const formData = new FormData()
    if (text) formData.append('text', text)
    if (pdfs) pdfs.forEach(f => formData.append('pdfs', f))
    if (images) images.forEach(f => formData.append('images', f))

    startAnalysis(formData)
  }, [])

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      {/* Background blobs */}
      <div className="blob w-96 h-96 bg-clay-lavender -top-20 -left-20 opacity-20" />
      <div className="blob w-80 h-80 bg-clay-mint bottom-0 right-0 opacity-20" style={{ animationDelay: '3s' }} />

      {/* Top bar */}
      <div className="relative z-10 px-4 pt-20 pb-3 flex-shrink-0">
        <ClayCard className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap" animate={false}>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => navigate('/')}
              className="clay-pill bg-clay-peach text-sm font-bold cursor-pointer hover:bg-clay-rose transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              ← Back
            </motion.button>
            <span className="font-black text-sm">Manus Investigation</span>
            {report.language && (
              <span className="clay-pill bg-clay-mint text-xs">🌐 {report.language}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {isRunning && (
                <motion.span
                  key="live"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="clay-pill bg-clay-yellow text-xs"
                >
                  ⚡ Live
                </motion.span>
              )}
              {!isRunning && events.length > 0 && (
                <motion.span
                  key="done"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="clay-pill bg-clay-mint text-xs"
                >
                  ✅ Complete
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </ClayCard>
      </div>

      {/* Error bar */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2 flex-shrink-0"
          >
            <ClayCard variant="peach" className="px-5 py-3 text-sm font-semibold" animate={false}>
              ⚠️ {error}
            </ClayCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split view */}
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4 px-4 pb-4 min-h-0">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="clay-card bg-white/60 backdrop-blur-sm p-4 min-h-0 overflow-hidden flex flex-col"
        >
          <AgentFeed events={events} isRunning={isRunning} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.08 }}
          className="clay-card bg-white/60 backdrop-blur-sm p-4 min-h-0 overflow-hidden flex flex-col"
        >
          <ReportPanel report={report} fullReport={fullReport} />
        </motion.div>
      </div>
    </div>
  )
}
