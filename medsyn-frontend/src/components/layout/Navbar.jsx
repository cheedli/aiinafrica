import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'New Case' },
  { to: '/patients', label: 'Patients' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/benchmark', label: 'Benchmark' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="bg-amber-600/95 backdrop-blur-sm border-b border-amber-500/60 px-6 py-1.5 flex items-center justify-center gap-2">
          <svg className="w-3 h-3 text-amber-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-[11px] text-amber-50 font-medium">Clinical Decision Support Only — Not a substitute for physician judgment. Always verify AI output before acting.</span>
        </div>
      <div className="bg-teal-900/95 backdrop-blur-md border-b border-teal-800/60 px-6 py-3.5 flex items-center justify-between"
        style={{ boxShadow: '0 2px 20px rgba(15,40,36,0.25)' }}>
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="w-8 h-8 rounded-xl bg-teal-400 border-2 border-teal-300/30 flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" fill="white" fillOpacity="0.9"/>
              <circle cx="7" cy="7" r="2" fill="#0f5c53"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-white text-base tracking-tight">MedSyn</span>
            <span className="text-teal-400 text-xs font-medium">Investigator</span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium no-underline transition-all duration-150
                ${pathname === to
                  ? 'bg-teal-700 text-white'
                  : 'text-teal-400 hover:text-white hover:bg-teal-800/60'}`}>
              {label}
            </Link>
          ))}
          <span className="ml-3 badge bg-teal-800 text-teal-300 border-teal-700/50 text-[10px]">AI4SDG3</span>
        </div>
      </div>
    </motion.nav>
  )
}
