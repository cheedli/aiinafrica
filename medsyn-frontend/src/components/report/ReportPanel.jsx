import { AnimatePresence, motion } from 'framer-motion'
import DiagnosisCard from './DiagnosisCard'
import EvidenceCard from './EvidenceCard'
import ActionPlanCard from './ActionPlanCard'
import ExportButton from './ExportButton'
import ClayCard from '../ui/ClayCard'

function SectionHeader({ children }) {
  return (
    <h3 className="font-black text-xs uppercase tracking-widest mb-2 px-1 text-black/60">
      {children}
    </h3>
  )
}

export default function ReportPanel({ report, fullReport }) {
  const hasContent = report.differentials?.length || report.evidence?.length || report.actionPlan

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="clay-card px-4 py-2.5 mb-3 flex-shrink-0 flex items-center justify-between">
        <span className="font-black text-sm">Clinical Brief</span>
        <div className="flex items-center gap-2">
          {report.language && (
            <span className="clay-pill bg-clay-mint text-xs">🌐 {report.language}</span>
          )}
          {fullReport && (
            <span className="clay-pill bg-clay-lavender text-xs">✅ Ready</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1">
        {!hasContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center flex-1 text-center p-8"
          >
            <span className="text-5xl mb-3">🧬</span>
            <p className="font-bold text-gray-500 text-sm">
              Report sections will appear here as Manus investigates...
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {report.differentials?.length > 0 && (
            <motion.div key="diff" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionHeader>🎯 Differential Diagnoses</SectionHeader>
              <div className="flex flex-col gap-3">
                {report.differentials.map((d, i) => (
                  <DiagnosisCard key={i} diagnosis={d} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {report.evidence?.length > 0 && (
            <motion.div key="ev" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionHeader>📚 PubMed Evidence</SectionHeader>
              <div className="flex flex-col gap-2">
                {report.evidence.map((e, i) => (
                  <EvidenceCard key={i} evidence={e} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {report.actionPlan && (
            <motion.div key="ap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionHeader>📋 Action Plan</SectionHeader>
              <ActionPlanCard actionPlan={report.actionPlan} />
            </motion.div>
          )}

          {report.whoContext && (
            <motion.div key="who" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ClayCard variant="sky" className="p-4">
                <h3 className="font-black text-sm mb-2">🌍 WHO Regional Context</h3>
                <p className="text-sm text-gray-700">{report.whoContext}</p>
              </ClayCard>
            </motion.div>
          )}

          {fullReport && (
            <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ExportButton report={fullReport} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
