import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-teal-900 border-b border-teal-800"
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="w-7 h-7 rounded-md bg-teal-400 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" fill="white" fillOpacity="0.9"/>
              <circle cx="7" cy="7" r="2" fill="#0f5c53"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-semibold text-white text-base tracking-tight">MedSyn</span>
            <span className="text-teal-400 text-xs font-medium">Investigator</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-teal-400 text-xs">Clinical Decision Support</span>
          <div className="h-4 w-px bg-teal-700 hidden sm:block" />
          <span className="text-teal-300 text-xs font-medium">AI4SDG3 · GITEX Africa 2026</span>
        </div>
      </div>
    </motion.nav>
  )
}
