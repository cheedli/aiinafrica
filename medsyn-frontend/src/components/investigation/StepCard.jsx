import { motion } from 'framer-motion'

const typeConfig = {
  step:    { dot: 'bg-teal-400',    label: 'Processing' },
  data:    { dot: 'bg-blue-400',    label: 'Data' },
  section: { dot: 'bg-emerald-400', label: 'Ready' },
  error:   { dot: 'bg-red-400',     label: 'Error' },
  done:    { dot: 'bg-emerald-400', label: 'Done' },
}

export default function StepCard({ event, index }) {
  const config = typeConfig[event.type] || typeConfig.step

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.2) }}
      className="flex gap-3 items-start py-2.5 px-4 border-b border-teal-800/40"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0 mt-1.5`} />
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-teal-500 block mb-0.5">
          {config.label}
        </span>
        <p className="text-xs text-teal-100 leading-relaxed">{event.message}</p>
        {event.data?.symptoms?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {event.data.symptoms.slice(0, 5).map((s, i) => (
              <span key={i} className="badge bg-teal-800 text-teal-200 border-teal-700/50 text-[10px]">{s}</span>
            ))}
          </div>
        )}
        {event.data?.count !== undefined && (
          <span className="mt-1 badge bg-teal-800 text-teal-300 border-teal-700/50 text-[10px]">
            {event.data.count} results
          </span>
        )}
      </div>
    </motion.div>
  )
}
