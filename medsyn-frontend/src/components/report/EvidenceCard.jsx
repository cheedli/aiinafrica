import { motion } from 'framer-motion'
import ClayCard from '../ui/ClayCard'

export default function EvidenceCard({ evidence, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25, delay: index * 0.06 }}
    >
      <ClayCard variant="white" className="p-4" animate={false}>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-clay bg-clay-sky border-2 border-black shadow-clay flex items-center justify-center text-sm flex-shrink-0">
            📄
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={evidence.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-sm leading-snug hover:underline line-clamp-2 block text-black"
            >
              {evidence.title}
            </a>
            <p className="text-xs text-gray-500 mt-0.5">
              {evidence.authors} · {evidence.journal} · {evidence.year}
            </p>
            {evidence.relevance_note && (
              <p className="text-xs text-gray-600 mt-1 italic">{evidence.relevance_note}</p>
            )}
            <a
              href={evidence.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 block font-mono"
            >
              PMID:{evidence.pmid}
            </a>
          </div>
        </div>
      </ClayCard>
    </motion.div>
  )
}
