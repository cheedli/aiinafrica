import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl"
    >
      <div className="clay-dark px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="w-8 h-8 rounded-xl bg-teal-400 border-2 border-teal-300/30 flex items-center justify-center"
            style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" fill="white" fillOpacity="0.9"/>
              <circle cx="7" cy="7" r="2" fill="#0f5c53"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-semibold text-white text-base tracking-tight">MedSyn</span>
            <span className="text-teal-400 text-xs font-medium">Investigator</span>
          </div>
          <span className="hidden sm:inline badge bg-teal-800 text-teal-300 border-teal-700/50">
            Clinical Decision Support
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="badge bg-teal-800 text-teal-300 border-teal-700/50">AI4SDG3</span>
          <span className="badge bg-teal-700 text-teal-200 border-teal-600/50">GITEX Africa 2026</span>
        </div>
      </div>
    </motion.nav>
  )
}
