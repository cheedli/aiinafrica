import { motion } from 'framer-motion'
import ClayCard from '../ui/ClayCard'
import ConfidenceBar from '../ui/ConfidenceBar'

const rankVariants = ['lavender', 'mint', 'sky', 'peach', 'yellow']

export default function DiagnosisCard({ diagnosis, index }) {
  const variant = rankVariants[diagnosis.rank - 1] || 'white'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25, delay: index * 0.08 }}
    >
      <ClayCard variant={variant} className="p-5" animate={false}>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-clay bg-white border-2 border-black shadow-clay flex items-center justify-center font-black text-sm flex-shrink-0">
            #{diagnosis.rank}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base leading-tight">{diagnosis.name}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {diagnosis.orpha_code && (
                <a
                  href={diagnosis.orphanet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="clay-pill bg-white text-xs hover:bg-clay-lavender transition-colors no-underline"
                >
                  ORPHA:{diagnosis.orpha_code}
                </a>
              )}
              {diagnosis.icd11_code && (
                <span className="clay-pill bg-white text-xs">ICD-11: {diagnosis.icd11_code}</span>
              )}
            </div>
          </div>
        </div>
        <ConfidenceBar confidence={diagnosis.confidence} />
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{diagnosis.reasoning}</p>
        {diagnosis.regional_prevalence && (
          <p className="mt-2 text-xs text-gray-600 bg-white/50 rounded-xl p-2 border border-black/10">
            🌍 {diagnosis.regional_prevalence}
          </p>
        )}
      </ClayCard>
    </motion.div>
  )
}
