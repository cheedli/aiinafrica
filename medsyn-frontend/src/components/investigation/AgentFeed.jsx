import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import StepCard from './StepCard'
import TypingIndicator from './TypingIndicator'

export default function AgentFeed({ events, isRunning }) {
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length, isRunning])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="clay-card-lavender px-4 py-2.5 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-3 h-3 rounded-full border-2 border-black ${isRunning ? 'bg-green-400' : events.length > 0 ? 'bg-clay-mint' : 'bg-gray-300'}`}
            animate={isRunning ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="font-black text-sm">Manus — Live Investigation</span>
          {events.length > 0 && (
            <span className="ml-auto clay-pill bg-white text-xs">{events.length} steps</span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
        {events.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-6 text-gray-400">
            <span className="text-4xl mb-2">🔬</span>
            <span className="text-sm font-medium">Waiting for investigation to start...</span>
          </div>
        )}
        {events.map((event, i) => (
          <StepCard key={i} event={event} index={i} />
        ))}
        {isRunning && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
