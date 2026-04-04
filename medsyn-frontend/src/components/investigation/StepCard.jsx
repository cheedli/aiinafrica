import { motion } from 'framer-motion'

const typeConfig = {
  step:    { dot: 'bg-teal-400',   label: 'Processing' },
  data:    { dot: 'bg-blue-400',   label: 'Data' },
  section: { dot: 'bg-emerald-400',label: 'Ready' },
  error:   { dot: 'bg-red-400',    label: 'Error' },
  done:    { dot: 'bg-emerald-400',label: 'Done' },
}

export default function StepCard({ event, index }) {
  const config = typeConfig[event.type] || typeConfig.step

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
      className="flex gap-3 items-start py-2.5 px-4 border-b border-teal-900/50"
    >
      <div className="flex flex-col items-center pt-1 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-500 block mb-0.5">
          {config.label}
        </span>
        <p className="text-xs text-teal-100 leading-relaxed">{event.message}</p>
        {event.data?.symptoms?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {event.data.symptoms.slice(0, 5).map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-teal-800 text-teal-200 text-xs">{s}</span>
            ))}
          </div>
        )}
        {event.data?.count !== undefined && (
          <span className="mt-1 inline-block px-2 py-0.5 rounded bg-teal-800 text-teal-300 text-xs">
            {event.data.count} results
          </span>
        )}
      </div>
    </motion.div>
  )
}
