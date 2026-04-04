import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-2 items-center p-3 rounded-clay border-[2px] border-black bg-white shadow-clay"
    >
      <span className="text-xl">🤖</span>
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 bg-clay-lavender rounded-full border-2 border-black"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.13, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-500">Manus is thinking...</span>
    </motion.div>
  )
}
