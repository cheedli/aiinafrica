import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 items-center py-3 px-4 border-b border-teal-900/50">
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-teal-400 block"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span className="text-xs text-teal-400">Manus is investigating...</span>
    </div>
  )
}
