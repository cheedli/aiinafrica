import { AnimatePresence, motion } from 'framer-motion'
import DiagnosisCard from './DiagnosisCard'
import EvidenceCard from './EvidenceCard'
import ActionPlanCard from './ActionPlanCard'
import ExportButton from './ExportButton'

function SectionHeader({ children }) {
  return <p className="section-label">{children}</p>
}

export default function ReportPanel({ report, fullReport }) {
  const hasContent = report.differentials?.length || report.evidence?.length || report.actionPlan

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-teal-100 flex items-center justify-between flex-shrink-0 bg-white">
        <span className="text-xs font-semibold uppercase tracking-widest text-teal-600">Clinical Brief</span>
        <div className="flex items-center gap-2">
          {report.language && (
            <span className="badge bg-teal-100 text-teal-700">{report.language}</span>
          )}
          {fullReport && (
            <span className="badge bg-emerald-100 text-emerald-700">Complete</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
        {!hasContent && (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 font-medium">Report will populate as Manus investigates</p>
          </div>
        )}

        <AnimatePresence>
          {report.differentials?.length > 0 && (
            <motion.div key="diff" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionHeader>Differential Diagnoses</SectionHeader>
              <div className="flex flex-col gap-3">
                {report.differentials.map((d, i) => (
                  <DiagnosisCard key={i} diagnosis={d} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {report.evidence?.length > 0 && (
            <motion.div key="ev" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="divider" />
              <SectionHeader>Supporting Evidence — PubMed</SectionHeader>
              <div className="flex flex-col">
                {report.evidence.map((e, i) => (
                  <EvidenceCard key={i} evidence={e} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {report.actionPlan && (
            <motion.div key="ap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="divider" />
              <SectionHeader>Action Plan</SectionHeader>
              <ActionPlanCard actionPlan={report.actionPlan} />
            </motion.div>
          )}

          {report.whoContext && (
            <motion.div key="who" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="divider" />
              <SectionHeader>WHO Regional Context</SectionHeader>
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <p className="text-sm text-teal-800 leading-relaxed">{report.whoContext}</p>
              </div>
            </motion.div>
          )}

          {fullReport && (
            <motion.div key="export" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="divider" />
              <ExportButton report={fullReport} />
              <p className="text-xs text-gray-400 text-center mt-2">
                Clinical decision support only. Review by licensed physician required.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
