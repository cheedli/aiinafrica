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
      <div className="px-4 py-3 border-b border-teal-800/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : events.length > 0 ? 'bg-teal-400' : 'bg-teal-700'}`} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-400">Agent Log</span>
        </div>
        {events.length > 0 && (
          <span className="text-[10px] text-teal-600">{events.length} events</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col">
        {events.length === 0 && !isRunning && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-xs text-teal-700">Waiting for investigation to start...</p>
          </div>
        )}
        {events.map((event, i) => <StepCard key={i} event={event} index={i} />)}
        {isRunning && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
