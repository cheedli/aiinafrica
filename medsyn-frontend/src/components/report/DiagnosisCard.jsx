import { motion } from 'framer-motion'

const confidenceColor = (c) => {
  if (c >= 0.75) return { bar: 'bg-emerald-500', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700 border-emerald-200/50' }
  if (c >= 0.5)  return { bar: 'bg-amber-500',   text: 'text-amber-700',   pill: 'bg-amber-100 text-amber-700 border-amber-200/50' }
  return               { bar: 'bg-orange-400',  text: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700 border-orange-200/50' }
}

export default function DiagnosisCard({ diagnosis, index }) {
  const pct = Math.round(diagnosis.confidence * 100)
  const colors = confidenceColor(diagnosis.confidence)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className="rounded-2xl border-[2px] border-teal-100 bg-white overflow-hidden"
      style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' }}
    >
      {/* Confidence bar */}
      <div className="h-1.5 bg-gray-100">
        <motion.div className={`h-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 + 0.25 }}
        />
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-teal-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}>
              {diagnosis.rank}
            </span>
            <h3 className="text-sm font-semibold text-teal-900 leading-tight">{diagnosis.name}</h3>
          </div>
          <span className={`badge flex-shrink-0 py-0.5 ${colors.pill}`}>{pct}%</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {diagnosis.orpha_code && (
            <a href={diagnosis.orphanet_url} target="_blank" rel="noreferrer"
              className="badge bg-teal-50 text-teal-600 border-teal-200/50 no-underline hover:bg-teal-100 transition-colors text-[10px]">
              ORPHA:{diagnosis.orpha_code}
            </a>
          )}
          {diagnosis.icd11_code && (
            <span className="badge bg-gray-50 text-gray-500 border-gray-200/50 text-[10px]">
              ICD-11: {diagnosis.icd11_code}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">{diagnosis.reasoning}</p>

        {diagnosis.regional_prevalence && (
          <div className="mt-2.5 rounded-xl bg-teal-50 border border-teal-100 px-3 py-2 flex items-start gap-2">
            <svg className="w-3 h-3 text-teal-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            <p className="text-xs text-teal-700 leading-relaxed">{diagnosis.regional_prevalence}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
