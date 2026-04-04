import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import UploadZone from '../components/upload/UploadZone'
import ClayCard from '../components/ui/ClayCard'

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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-16">
      {/* Background blobs */}
      <div className="blob w-[500px] h-[500px] bg-clay-lavender -top-20 -left-40" style={{ animationDelay: '0s' }} />
      <div className="blob w-[400px] h-[400px] bg-clay-mint bottom-0 -right-20" style={{ animationDelay: '2.5s' }} />
      <div className="blob w-[300px] h-[300px] bg-clay-peach top-1/3 right-10" style={{ animationDelay: '5s' }} />

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-7">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="inline-block clay-card-mint px-5 py-1.5 mb-5 text-sm font-black"
          >
            🤖 Gemini 2.0 Flash · Florence-2 · PubMed · Orphanet · WHO GHO
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-black leading-[1.1] mb-4 tracking-tight">
            Upload anything.
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">Manus investigates.</span>
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-4 bg-clay-lavender border-2 border-black rounded-full"
                style={{ zIndex: -1 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
              />
            </span>
          </h1>
          <p className="text-base text-gray-600 max-w-lg mx-auto leading-relaxed">
            Autonomous AI diagnostic agent for undiagnosed conditions across Africa.
            Accepts patient notes in <strong>Arabic</strong>, <strong>French</strong>, or <strong>English</strong>.
          </p>
        </motion.div>

        {/* Text input */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 250, damping: 24 }}
        >
          <ClayCard className="p-5 w-full" animate={false}>
            <label className="flex items-center gap-2 font-black text-sm mb-3">
              📝 Patient Description
              <span className="clay-pill bg-clay-mint text-xs">Arabic · Français · English</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={"Describe the patient's symptoms, history, lab results...\nوصف الأعراض والتاريخ المرضي...\nDécrivez les symptômes et l'historique..."}
              rows={5}
              className="w-full rounded-xl border-2 border-black/20 p-3 text-sm resize-none focus:outline-none focus:border-black/50 bg-transparent placeholder:text-gray-400 leading-relaxed"
            />
          </ClayCard>
        </motion.div>

        {/* Upload zones */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 250, damping: 24 }}
        >
          <UploadZone
            label="Lab Reports / Discharge Letters"
            icon="📄"
            variant="peach"
            accept=".pdf"
            multiple
            onFiles={setPdfs}
          />
          <UploadZone
            label="Medical Images / Scans"
            icon="🔬"
            variant="sky"
            accept="image/*"
            multiple
            onFiles={setImages}
          />
        </motion.div>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 22 }}
        >
          <motion.button
            onClick={handleStart}
            disabled={!canStart}
            className="clay-btn bg-clay-lavender text-black text-lg px-12 py-4 disabled:opacity-40 disabled:cursor-not-allowed font-black"
            whileHover={canStart ? { scale: 1.04, y: -3 } : {}}
            whileTap={canStart ? { scale: 0.97 } : {}}
          >
            🚀 Start Investigation
          </motion.button>
        </motion.div>

        {/* SDG tags */}
        <motion.div
          className="flex flex-wrap gap-2 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {['SDG 3.4 · NCDs', 'SDG 3.8 · Universal Coverage', 'SDG 3.d · Health Security'].map(tag => (
            <span key={tag} className="clay-pill bg-white/80 text-xs">{tag}</span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
