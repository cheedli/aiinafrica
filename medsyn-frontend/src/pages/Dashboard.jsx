import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const API = 'http://localhost:8000'

function StatCard({ label, value, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="clay p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-teal-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </motion.div>
  )
}

function BarChart({ items, colorClass = 'bg-teal-500' }) {
  if (!items?.length) return <p className="text-xs text-gray-400">No data yet</p>
  const max = Math.max(...items.map(i => i.cnt))
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-40 truncate flex-shrink-0">{item.top_diagnosis || item.detected_language || item.date}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${colorClass}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.cnt / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 w-4">{item.cnt}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/stats`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="relative min-h-screen pt-16 pb-12 px-4">
      <div className="blob w-96 h-96 bg-teal-300 -top-20 -right-20" />
      <div className="blob w-64 h-64 bg-teal-400 bottom-20 left-0" style={{ animationDelay: '5s' }} />

      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6">
          <p className="section-label">Overview</p>
          <h1 className="text-2xl font-bold text-teal-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">All investigations run through MedSyn Investigator</p>
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

        {!loading && !stats?.total_investigations && (
          <div className="clay p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center mx-auto mb-3"
              style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.08)' }}>
              <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-4">No investigations yet. Run your first case to see stats.</p>
            <Link to="/" className="btn-primary text-sm py-2 px-5 inline-block no-underline">Start Investigation</Link>
          </div>
        )}

        {stats?.total_investigations > 0 && (
          <div className="flex flex-col gap-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Cases" value={stats.total_investigations} sub="investigations run" delay={0} />
              <StatCard label="Patients" value={stats.total_patients || 0} sub="on record" delay={0.07} />
              <StatCard label="Avg Confidence" value={`${stats.avg_confidence_pct}%`} sub="top diagnosis" delay={0.14} />
              <StatCard label="Languages" value={stats.languages?.length || 0} sub="detected" delay={0.21} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top diagnoses */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }} className="clay p-5">
                <p className="section-label">Top Diagnoses</p>
                <BarChart items={stats.top_diagnoses} colorClass="bg-teal-500" />
              </motion.div>

              {/* Languages */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }} className="clay p-5">
                <p className="section-label">Languages Detected</p>
                <BarChart items={stats.languages} colorClass="bg-emerald-400" />
              </motion.div>
            </div>

            {/* Daily activity */}
            {stats.daily_activity?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.42 }} className="clay p-5">
                <p className="section-label">Daily Activity (last 14 days)</p>
                <BarChart items={stats.daily_activity} colorClass="bg-teal-400" />
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }} className="flex justify-end">
              <Link to="/history" className="btn-ghost text-sm no-underline">View full history</Link>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
