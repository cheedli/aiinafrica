import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl"
    >
      <div className="clay-card bg-white/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-10 h-10 rounded-clay bg-clay-lavender border-[3px] border-black shadow-clay flex items-center justify-center font-black text-xl"
          >
            M
          </motion.div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-xl tracking-tight text-black">MedSyn</span>
            <span className="text-xs font-semibold text-gray-500">Investigator</span>
          </div>
          <span className="clay-pill bg-clay-mint text-xs hidden sm:inline">AI Diagnostic Agent</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="clay-pill bg-clay-peach text-xs hidden sm:inline">AI4SDG3</span>
          <span className="clay-pill bg-clay-sky text-xs">GITEX Africa 2026</span>
        </div>
      </div>
    </motion.nav>
  )
}
