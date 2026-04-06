import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Body from 'react-muscle-highlighter'

const SLUG_LABELS = {
  head: 'Head', neck: 'Neck', chest: 'Chest', abs: 'Abdomen', obliques: 'Obliques',
  'upper-back': 'Upper Back', 'lower-back': 'Lower Back', trapezius: 'Trapezius',
  deltoids: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearm: 'Forearm',
  hands: 'Hands', gluteal: 'Gluteal', adductors: 'Adductors', abductors: 'Abductors',
  quadriceps: 'Quadriceps', hamstring: 'Hamstring', knees: 'Knees', calves: 'Calves',
  tibialis: 'Tibialis', ankles: 'Ankles', feet: 'Feet',
}

export default function BodyMap({ patient, patientId, onPartClick }) {
  const [aiParts, setAiParts] = useState([])        // red — AI detected from docs
  const [manualParts, setManualParts] = useState([]) // teal — manually toggled
  const [reasoning, setReasoning] = useState({})
  const [view, setView] = useState('front')
  const [hovered, setHovered] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchBodyParts = async () => {
    setLoading(true)
    try {
      const r = await fetch(`http://localhost:8000/patients/${patientId}/body-parts`)
      const d = await r.json()
      setAiParts(d.affected_parts || [])
      setReasoning(d.reasoning || {})
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (patientId) fetchBodyParts()
  }, [patientId])

  const handlePress = (part) => {
    if (!part?.slug) return
    const slug = part.slug

    // Toggle manual highlight
    setManualParts(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )

    // Fire the click callback so parent can inject into chat
    onPartClick?.(slug, SLUG_LABELS[slug] || slug, reasoning[slug] || null)
  }

  const handleHover = (part) => setHovered(part?.slug || null)

  // Build data: AI parts = red, manual = teal, overlap = red wins
  const data = [
    ...aiParts.map(slug => ({ slug, color: '#dc2626' })),          // red
    ...manualParts
      .filter(s => !aiParts.includes(s))
      .map(slug => ({ slug, color: '#0f5c53' })),                   // teal
  ]

  const hoveredLabel = hovered ? (SLUG_LABELS[hovered] || hovered) : null
  const hoveredReason = hovered ? reasoning[hovered] : null
  const isAiPart = hovered && aiParts.includes(hovered)

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="section-label mb-0">Body Map</p>
        <div className="flex items-center gap-2">
          <button onClick={fetchBodyParts} disabled={loading}
            className="text-[10px] text-teal-500 hover:text-teal-700 transition-colors disabled:opacity-40">
            {loading ? 'Analyzing...' : '↻ Re-analyze'}
          </button>
          {manualParts.length > 0 && (
            <button onClick={() => setManualParts([])}
              className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">
              Clear manual
            </button>
          )}
          <div className="flex rounded-lg overflow-hidden border border-teal-200/60">
            <button onClick={() => setView('front')}
              className={`text-[10px] px-2 py-1 transition-colors ${view === 'front' ? 'bg-teal-700 text-white' : 'bg-white text-teal-600 hover:bg-teal-50'}`}>
              Front
            </button>
            <button onClick={() => setView('back')}
              className={`text-[10px] px-2 py-1 transition-colors ${view === 'back' ? 'bg-teal-700 text-white' : 'bg-white text-teal-600 hover:bg-teal-50'}`}>
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
          <span className="text-[10px] text-gray-500">AI detected</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-teal-700 inline-block" />
          <span className="text-[10px] text-gray-500">Manual</span>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredLabel && (
          <motion.div
            key={hoveredLabel}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`rounded-xl px-3 py-2 border text-xs ${
              isAiPart
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-teal-50 border-teal-200 text-teal-800'
            }`}>
            <p className="font-semibold">{hoveredLabel}</p>
            {hoveredReason && <p className="text-[10px] mt-0.5 opacity-80">{hoveredReason}</p>}
            {isAiPart && !hoveredReason && <p className="text-[10px] mt-0.5 opacity-70">AI detected from documents · click to ask AI</p>}
            {!isAiPart && <p className="text-[10px] mt-0.5 opacity-70">Click to ask AI about this region</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body model */}
      <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
        className="flex justify-center">
        <Body
          data={data}
          side={view}
          gender={patient?.sex?.toLowerCase() === 'female' ? 'female' : 'male'}
          scale={1.15}
          defaultFill="#d1ede9"
          border="#9ed8d0"
          colors={['#dc2626', '#0f5c53']}
          onBodyPartPress={handlePress}
          onBodyPartHover={handleHover}
        />
      </motion.div>

      {/* Affected region badges */}
      {(aiParts.length > 0 || manualParts.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {aiParts.map(s => (
            <span key={s} onClick={() => onPartClick?.(s, SLUG_LABELS[s] || s, reasoning[s] || null)}
              className="badge bg-red-600 text-white border-red-500 text-[10px] cursor-pointer hover:bg-red-700 transition-colors capitalize">
              {SLUG_LABELS[s] || s.replace(/-/g, ' ')}
            </span>
          ))}
          {manualParts.filter(s => !aiParts.includes(s)).map(s => (
            <span key={s} onClick={() => onPartClick?.(s, SLUG_LABELS[s] || s, null)}
              className="badge bg-teal-700 text-teal-100 border-teal-600/50 text-[10px] cursor-pointer hover:bg-teal-800 transition-colors capitalize">
              {SLUG_LABELS[s] || s.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        {loading ? 'AI analyzing documents...' : 'Click any region to ask AI · hover for details'}
      </p>
    </div>
  )
}
