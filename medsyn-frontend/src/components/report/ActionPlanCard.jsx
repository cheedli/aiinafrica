import { motion } from 'framer-motion'
import ClayCard from '../ui/ClayCard'

function PlanSection({ title, icon, items, variant, delay }) {
  if (!items?.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25, delay }}
    >
      <ClayCard variant={variant} className="p-4" animate={false}>
        <h4 className="font-black text-sm mb-2.5">{icon} {title}</h4>
        <ul className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-black/30 font-mono text-xs mt-0.5 flex-shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ClayCard>
    </motion.div>
  )
}

export default function ActionPlanCard({ actionPlan }) {
  return (
    <div className="flex flex-col gap-3">
      <PlanSection title="Tests to Order" icon="🧪" items={actionPlan.tests_to_order} variant="mint" delay={0} />
      <PlanSection title="Specialists to Consult" icon="👨‍⚕️" items={actionPlan.specialists_to_consult} variant="sky" delay={0.08} />
      <PlanSection title="Hypotheses to Rule Out" icon="❌" items={actionPlan.hypotheses_to_rule_out} variant="peach" delay={0.16} />
    </div>
  )
}
