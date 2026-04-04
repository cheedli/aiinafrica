import { motion } from 'framer-motion'

const confidenceColor = (c) => {
  if (c >= 0.75) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' }
  if (c >= 0.5)  return { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50' }
  return               { bar: 'bg-orange-400',  text: 'text-orange-700',  bg: 'bg-orange-50' }
}

export default function DiagnosisCard({ diagnosis, index }) {
  const pct = Math.round(diagnosis.confidence * 100)
  const colors = confidenceColor(diagnosis.confidence)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="border border-teal-100 rounded-xl overflow-hidden bg-white shadow-card"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-teal-50">
        <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {diagnosis.rank}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-teal-900 leading-tight">{diagnosis.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {diagnosis.orpha_code && (
              <a href={diagnosis.orphanet_url} target="_blank" rel="noreferrer"
                className="badge bg-teal-100 text-teal-700 no-underline hover:bg-teal-200 transition-colors">
                ORPHA:{diagnosis.orpha_code}
              </a>
            )}
            {diagnosis.icd11_code && (
              <span className="badge bg-gray-100 text-gray-600">ICD-11: {diagnosis.icd11_code}</span>
            )}
          </div>
        </div>
        <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg ${colors.bg}`}>
          <span className={`text-sm font-bold ${colors.text}`}>{pct}%</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1 bg-gray-100">
        <motion.div
          className={`h-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 + 0.2 }}
        />
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-600 leading-relaxed">{diagnosis.reasoning}</p>
        {diagnosis.regional_prevalence && (
          <div className="mt-2.5 flex items-start gap-2 bg-teal-50 rounded-lg p-2.5">
            <svg className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            <p className="text-xs text-teal-700 leading-relaxed">{diagnosis.regional_prevalence}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
