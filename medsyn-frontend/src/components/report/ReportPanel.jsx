import { AnimatePresence, motion } from 'framer-motion'
import DiagnosisCard from './DiagnosisCard'
import EvidenceCard from './EvidenceCard'
import ActionPlanCard from './ActionPlanCard'
import ExportButton from './ExportButton'

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
}

export default function ReportPanel({ report, fullReport }) {
  const hasContent = report.differentials?.length || report.evidence?.length || report.actionPlan

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-teal-100/80 flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-600">Clinical Brief</span>
        <div className="flex items-center gap-2">
          {report.language && (
            <span className="badge bg-teal-50 text-teal-600 border-teal-100">{report.language}</span>
          )}
          {fullReport && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="badge bg-emerald-50 text-emerald-600 border-emerald-100">
              Complete
            </motion.span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {!hasContent && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center mb-3"
              style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.08)' }}>
              <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Report will populate as Manus investigates</p>
          </div>
        )}

        <AnimatePresence>
          {report.differentials?.length > 0 && (
            <motion.div key="diff" variants={sectionVariants} initial="hidden" animate="visible">
              <p className="section-label">Differential Diagnoses</p>
              <div className="flex flex-col gap-3">
                {report.differentials.map((d, i) => <DiagnosisCard key={i} diagnosis={d} index={i} />)}
              </div>
            </motion.div>
          )}

          {report.evidence?.length > 0 && (
            <motion.div key="ev" variants={sectionVariants} initial="hidden" animate="visible">
              <div className="divider" />
              <p className="section-label">Supporting Evidence — PubMed</p>
              <div className="rounded-2xl border-[2px] border-teal-100 bg-white overflow-hidden"
                style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.08)' }}>
                {report.evidence.map((e, i) => <EvidenceCard key={i} evidence={e} index={i} />)}
              </div>
            </motion.div>
          )}

          {report.actionPlan && (
            <motion.div key="ap" variants={sectionVariants} initial="hidden" animate="visible">
              <div className="divider" />
              <p className="section-label">Action Plan</p>
              <div className="rounded-2xl border-[2px] border-teal-100 bg-white p-4"
                style={{ boxShadow: '3px 3px 0px rgba(15,92,83,0.08)' }}>
                <ActionPlanCard actionPlan={report.actionPlan} />
              </div>
            </motion.div>
          )}

          {report.whoContext && (
            <motion.div key="who" variants={sectionVariants} initial="hidden" animate="visible">
              <div className="divider" />
              <p className="section-label">WHO Regional Context</p>
              <div className="clay-teal p-4">
                <p className="text-sm text-teal-800 leading-relaxed">{report.whoContext}</p>
              </div>
            </motion.div>
          )}

          {fullReport && (
            <motion.div key="export" variants={sectionVariants} initial="hidden" animate="visible">
              <div className="divider" />
              <ExportButton report={fullReport} />
              <p className="text-xs text-gray-400 text-center mt-2">
                Clinical decision support only — physician review required.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
