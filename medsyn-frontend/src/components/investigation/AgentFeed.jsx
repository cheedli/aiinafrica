import { useEffect, useRef } from 'react'
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
      <div className="px-4 py-3 border-b border-teal-900/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : events.length > 0 ? 'bg-teal-400' : 'bg-teal-700'}`} />
          <span className="text-xs font-semibold text-teal-200 uppercase tracking-widest">
            Agent Log
          </span>
        </div>
        {events.length > 0 && (
          <span className="text-xs text-teal-500">{events.length} events</span>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {events.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
            <p className="text-xs text-teal-600">Waiting for investigation to start...</p>
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
