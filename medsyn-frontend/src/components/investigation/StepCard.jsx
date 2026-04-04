import { motion } from 'framer-motion'

const typeConfig = {
  step: { icon: '🔍', bg: 'bg-white', label: 'Investigating' },
  data: { icon: '📊', bg: 'bg-clay-sky', label: 'Data Found' },
  section: { icon: '✅', bg: 'bg-clay-mint', label: 'Section Ready' },
  error: { icon: '⚠️', bg: 'bg-clay-peach', label: 'Error' },
  done: { icon: '🎯', bg: 'bg-clay-lavender', label: 'Done' },
}

export default function StepCard({ event, index }) {
  const config = typeConfig[event.type] || typeConfig.step

  return (
    <motion.div
      initial={{ opacity: 0, x: -24, scale: 0.93 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26, delay: Math.min(index * 0.04, 0.3) }}
      className={`flex gap-3 items-start p-3 rounded-clay border-[2px] border-black shadow-clay ${config.bg}`}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-black/40 block mb-0.5">
          {config.label}
        </span>
        <p className="text-sm font-medium leading-snug">{event.message}</p>
        {event.data?.symptoms?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {event.data.symptoms.slice(0, 5).map((s, i) => (
              <span key={i} className="clay-pill bg-clay-lavender text-xs">{s}</span>
            ))}
          </div>
        )}
        {event.data?.diseases?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {event.data.diseases.map((d, i) => (
              <span key={i} className="clay-pill bg-clay-peach text-xs">{d}</span>
            ))}
          </div>
        )}
        {event.data?.count !== undefined && (
          <span className="mt-1 inline-block clay-pill bg-white text-xs">
            {event.data.count} results
          </span>
        )}
      </div>
    </motion.div>
  )
}
