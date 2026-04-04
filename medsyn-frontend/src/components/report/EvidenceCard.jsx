import { motion } from 'framer-motion'

export default function EvidenceCard({ evidence, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="flex gap-3 py-3 border-b border-teal-50 last:border-0"
    >
      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <a href={evidence.url} target="_blank" rel="noreferrer"
          className="text-sm font-medium text-teal-900 hover:text-teal-600 line-clamp-2 leading-snug no-underline block transition-colors">
          {evidence.title}
        </a>
        <p className="text-xs text-gray-400 mt-0.5">
          {evidence.authors} &middot; {evidence.journal} &middot; {evidence.year}
        </p>
        {evidence.relevance_note && (
          <p className="text-xs text-gray-500 mt-1 italic leading-relaxed">{evidence.relevance_note}</p>
        )}
        <a href={evidence.url} target="_blank" rel="noreferrer"
          className="text-xs text-teal-500 hover:underline mt-0.5 block font-mono">
          PMID:{evidence.pmid}
        </a>
      </div>
    </motion.div>
  )
}
