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
      className={`relative border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all duration-150
        ${drag ? 'border-teal-500 bg-teal-50' : files.length ? 'border-teal-400 bg-teal-50/50' : 'border-teal-200 bg-white hover:border-teal-400 hover:bg-teal-50/30'}`}
      onClick={() => document.getElementById(id)?.click()}
    >
      <input id={id} type="file" accept={accept} multiple={multiple} className="hidden"
        onChange={e => handle(e.target.files)} />
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${files.length ? 'bg-teal-600' : 'bg-teal-100'}`}>
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
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-xs font-medium truncate max-w-[160px]">
                  {f.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-teal-500 mt-1">Drop files here or click to browse</p>
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

  const handleStart = () => {
    if (!canStart) return
    navigate('/investigate', { state: { text, pdfs, images } })
  }

  return (
    <div className="min-h-screen bg-surface pt-14 flex flex-col">
      {/* Hero strip */}
      <div className="bg-teal-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="badge bg-teal-700 text-teal-200 text-xs">Autonomous Diagnostic Agent</span>
              <span className="badge bg-teal-800 text-teal-300 text-xs">PubMed · Orphanet · WHO GHO</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight text-white mb-3">
              AI-powered differential diagnosis<br />for undiagnosed conditions in Africa
            </h1>
            <p className="text-teal-300 text-base max-w-2xl leading-relaxed">
              Submit a patient case in Arabic, French, or English. Manus autonomously investigates
              the medical literature and returns a ranked differential diagnosis with evidence-backed
              confidence scores and a precise action plan.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Input form */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="card p-6"
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
                Accepts Arabic, French, and English. Output language matches input.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <UploadBox
                label="Lab Reports & Documents"
                sublabel="PDF files — lab results, discharge letters"
                accept=".pdf"
                multiple
                files={pdfs}
                onFiles={setPdfs}
              />
              <UploadBox
                label="Medical Images"
                sublabel="Scans, X-rays, photos — analyzed by Florence-2"
                accept="image/*"
                multiple
                files={images}
                onFiles={setImages}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="btn-primary w-full py-3.5 text-sm"
              >
                Begin Investigation
              </button>
            </motion.div>
          </div>

          {/* Right: Info panel */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col gap-4"
          >
            <div className="card p-5">
              <p className="section-label">How it works</p>
              <ol className="flex flex-col gap-3">
                {[
                  ['Submit', 'Enter the patient case in any supported language'],
                  ['Investigate', 'Manus autonomously queries PubMed, Orphanet, and WHO'],
                  ['Synthesize', 'Ranked differential diagnosis with confidence scores'],
                  ['Act', 'Receive a precise action plan with tests and referrals'],
                ].map(([title, desc], i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-teal-900">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card p-5">
              <p className="section-label">Data Sources</p>
              <div className="flex flex-col gap-2">
                {[
                  ['PubMed Open Access', '4M+ full-text articles'],
                  ['Orphanet', '6,000+ rare disease profiles'],
                  ['WHO GHO', 'Regional epidemiological data'],
                  ['Florence-2', 'Medical image captioning'],
                ].map(([name, desc]) => (
                  <div key={name} className="flex items-center justify-between py-1.5 border-b border-teal-50 last:border-0">
                    <span className="text-xs font-semibold text-teal-800">{name}</span>
                    <span className="text-xs text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-teal-800 p-4 text-teal-200 text-xs leading-relaxed">
              <p className="font-semibold text-white mb-1">Clinical Decision Support Only</p>
              This tool is designed to support — not replace — clinical judgment.
              All outputs must be reviewed by a licensed physician before any diagnostic
              or treatment decision is made.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
