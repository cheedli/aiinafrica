import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

function UploadBox({ label, sublabel, accept, multiple, onFiles, files }) {
  const [drag, setDrag] = useState(false)
  const id = label.replace(/\s/g, '-')

  const handle = (f) => {
    const arr = Array.from(f)
    if (arr.length) onFiles(arr)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files) }}
      onClick={() => document.getElementById(id)?.click()}
      className={`rounded-2xl border-[2px] p-5 cursor-pointer transition-all duration-150
        ${drag
          ? 'border-teal-400 bg-teal-50'
          : files.length
            ? 'border-teal-400/60 bg-teal-50/80'
            : 'border-dashed border-teal-300/60 bg-white/60 hover:border-teal-400 hover:bg-teal-50/40'
        }`}
      style={{ boxShadow: files.length ? '3px 3px 0px rgba(15,92,83,0.12)' : 'none' }}
    >
      <input id={id} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={e => handle(e.target.files)} />
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border-2
          ${files.length ? 'bg-teal-600 border-teal-700/30' : 'bg-teal-100 border-teal-200/50'}`}
          style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.08)' }}>
          <svg className={`w-4 h-4 ${files.length ? 'text-white' : 'text-teal-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-teal-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
          {files.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {files.map((f, i) => (
                <span key={i} className="badge bg-teal-100 text-teal-800 border-teal-200/50 truncate max-w-[140px]">
                  {f.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-teal-500/70 mt-1">Drop files here or click to browse</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [pdfs, setPdfs] = useState([])
  const [images, setImages] = useState([])

  const canStart = text.trim() || pdfs.length || images.length

  return (
    <div className="relative min-h-screen pt-16 pb-12 px-4">
      {/* Background blobs */}
      <div className="blob w-[500px] h-[500px] bg-teal-300 -top-20 -left-40" />
      <div className="blob w-[400px] h-[400px] bg-teal-400 bottom-0 -right-20" style={{ animationDelay: '3s' }} />
      <div className="blob w-[300px] h-[300px] bg-teal-200 top-1/2 left-1/3" style={{ animationDelay: '6s' }} />

      <div className="relative z-10 max-w-5xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 mb-5"
          >
            <span className="badge bg-teal-700 text-teal-200 border-teal-600/40 py-1 px-3">
              Autonomous Diagnostic Agent
            </span>
            <span className="badge bg-white text-teal-700 border-teal-200 py-1 px-3">
              PubMed · Orphanet · WHO GHO
            </span>
          </motion.div>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight text-teal-950 mb-3 tracking-tight">
            AI-powered differential diagnosis
            <br />
            <span className="text-teal-600">for undiagnosed conditions in Africa</span>
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
            Submit a patient case in Arabic, French, or English. Manus autonomously
            investigates the literature and returns a ranked differential diagnosis
            with evidence-backed confidence scores.
          </p>
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Input */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="clay p-6"
            >
              <label className="section-label block">Patient Presentation</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={7}
                className="input-field resize-none leading-relaxed"
                placeholder={"Describe symptoms, history, lab results, medications...\n\nوصف الأعراض والتاريخ المرضي والنتائج المخبرية...\n\nDécrivez les symptômes, l'historique médical, les résultats de laboratoire..."}
              />
              <p className="text-xs text-gray-400 mt-2">
                Accepts Arabic, French, and English — output language matches input.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <UploadBox label="Lab Reports & Documents" sublabel="PDF — lab results, discharge letters"
                accept=".pdf" multiple files={pdfs} onFiles={setPdfs} />
              <UploadBox label="Medical Images" sublabel="Scans, X-rays, photos — analyzed by Florence-2"
                accept="image/*" multiple files={images} onFiles={setImages} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <motion.button
                onClick={() => canStart && navigate('/investigate', { state: { text, pdfs, images } })}
                disabled={!canStart}
                className="btn-primary w-full py-4 text-base"
                whileHover={canStart ? { y: -2 } : {}}
                whileTap={canStart ? { y: 1 } : {}}
              >
                Begin Investigation
              </motion.button>
            </motion.div>
          </div>

          {/* Right: Info */}
          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="clay p-5"
            >
              <p className="section-label">How it works</p>
              <ol className="flex flex-col gap-3.5">
                {[
                  ['Submit', 'Enter the patient case in any supported language'],
                  ['Investigate', 'Manus queries PubMed, Orphanet, and WHO autonomously'],
                  ['Synthesize', 'Ranked differentials with evidence-backed confidence scores'],
                  ['Act', 'Precise action plan — tests, referrals, hypotheses to rule out'],
                ].map(([title, desc], i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-xl bg-teal-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-teal-900">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28, duration: 0.4 }}
              className="clay p-5"
            >
              <p className="section-label">Data Sources</p>
              <div className="flex flex-col">
                {[
                  ['PubMed Open Access', '4M+ articles'],
                  ['Orphanet', '6,000+ rare diseases'],
                  ['WHO GHO', 'Regional epidemiology'],
                  ['Florence-2', 'Medical image AI'],
                ].map(([name, desc]) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-teal-50 last:border-0">
                    <span className="text-xs font-semibold text-teal-800">{name}</span>
                    <span className="text-xs text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.34, duration: 0.4 }}
              className="clay-dark p-4"
            >
              <p className="text-xs font-semibold text-teal-300 mb-1">Clinical Decision Support Only</p>
              <p className="text-xs text-teal-400 leading-relaxed">
                All outputs must be reviewed by a licensed physician before any diagnostic
                or treatment decision is made.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
