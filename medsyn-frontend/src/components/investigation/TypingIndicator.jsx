import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const THINKING_STEPS = [
  "Analyzing clinical presentation...",
  "Searching PubMed for relevant literature...",
  "Querying Orphanet rare disease registry...",
  "Cross-referencing WHO epidemiological data...",
  "Evaluating regional prevalence in Africa...",
  "Building differential diagnosis ranking...",
  "Extracting evidence from medical literature...",
  "Synthesizing clinical reasoning...",
  "Checking ICD-11 and ORPHA codes...",
  "Finalizing diagnostic report...",
]

export default function TypingIndicator({ lastPingMessage }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  // Cycle through thinking steps every 4s unless we have a real ping message
  useEffect(() => {
    if (lastPingMessage) return
    const interval = setInterval(() => {
      setStepIndex(i => (i + 1) % THINKING_STEPS.length)
      setIsTyping(true)
      setDisplayText('')
    }, 4000)
    return () => clearInterval(interval)
  }, [lastPingMessage])

  const currentText = lastPingMessage || THINKING_STEPS[stepIndex]

  // Typewriter effect
  useEffect(() => {
    if (!isTyping) return
    setDisplayText('')
    let i = 0
    const interval = setInterval(() => {
      setDisplayText(currentText.slice(0, i + 1))
      i++
      if (i >= currentText.length) {
        clearInterval(interval)
        setIsTyping(false)
      }
    }, 18)
    return () => clearInterval(interval)
  }, [currentText, isTyping])

  useEffect(() => {
    if (lastPingMessage) {
      setIsTyping(true)
      setDisplayText('')
    }
  }, [lastPingMessage])

  return (
    <div className="flex gap-3 items-start py-3 px-4 border-b border-teal-800/40">
      <div className="flex gap-1 items-center mt-1.5 flex-shrink-0">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 block"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-emerald-500 block mb-0.5">
          {lastPingMessage ? 'Agent Update' : 'Investigating'}
        </span>
        <p className="text-xs text-teal-200 leading-relaxed">
          {displayText}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-0.5 h-3 bg-teal-400 ml-0.5 align-middle"
          />
        </p>
      </div>
    </div>
  )
}
