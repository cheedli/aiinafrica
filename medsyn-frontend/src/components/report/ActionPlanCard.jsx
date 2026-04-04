import { motion } from 'framer-motion'

function PlanSection({ title, items, delay, accentClass }) {
  if (!items?.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${accentClass}`}>
              {i + 1}
            </span>
            <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export default function ActionPlanCard({ actionPlan }) {
  return (
    <div className="flex flex-col gap-5">
      <PlanSection title="Tests to Order" items={actionPlan.tests_to_order}
        delay={0} accentClass="bg-teal-100 text-teal-700" />
      <PlanSection title="Specialists to Consult" items={actionPlan.specialists_to_consult}
        delay={0.06} accentClass="bg-sage-100 text-sage-600" />
      <PlanSection title="Hypotheses to Rule Out" items={actionPlan.hypotheses_to_rule_out}
        delay={0.12} accentClass="bg-amber-100 text-amber-700" />
    </div>
  )
}
