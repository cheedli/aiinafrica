import { motion } from 'framer-motion'

const getColor = (confidence) => {
  if (confidence >= 0.75) return 'bg-clay-mint'
  if (confidence >= 0.5) return 'bg-clay-yellow'
  return 'bg-clay-peach'
}

export default function ConfidenceBar({ confidence, label }) {
  const pct = Math.round(confidence * 100)
  const color = getColor(confidence)

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600">{label || 'Confidence'}</span>
        <span className="text-xs font-black">{pct}%</span>
      </div>
      <div className="w-full h-4 bg-gray-100 rounded-full border-2 border-black overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
        />
      </div>
    </div>
  )
}
