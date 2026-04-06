import { useEffect, useRef } from 'react'
import StepCard from './StepCard'
import TypingIndicator from './TypingIndicator'

export default function AgentFeed({ events, isRunning, taskUrl }) {
  const bottomRef = useRef()
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length, isRunning])

  // Extract last meaningful Manus ping response for the typewriter
  const lastPing = [...events].reverse().find(e =>
    e.type === 'step' && e.message?.startsWith('Manus:') && !e.message?.includes('Final diagnostic') && !e.message?.includes('task created')
  )
  const lastPingMessage = lastPing ? lastPing.message.replace('Manus: ', '') : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-teal-800/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : events.length > 0 ? 'bg-teal-400' : 'bg-teal-700'}`} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-400">Agent Log</span>
          </div>
          {events.length > 0 && (
            <span className="text-[10px] text-teal-600">{events.length} events</span>
          )}
        </div>

        {/* Live Manus link */}
        {taskUrl && (
          <a
            href={taskUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 w-full rounded-xl bg-teal-800/60 border border-teal-700/50 px-3 py-2 no-underline group hover:bg-teal-700/60 transition-colors"
            style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[11px] text-teal-300 font-medium flex-1">Watch Manus investigate live</span>
            <svg className="w-3 h-3 text-teal-500 group-hover:text-teal-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {events.length === 0 && !isRunning && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-xs text-teal-700">Waiting for investigation to start...</p>
          </div>
        )}
        {events.map((event, i) => <StepCard key={i} event={event} index={i} />)}
        {isRunning && <TypingIndicator lastPingMessage={lastPingMessage} />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
