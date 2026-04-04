import { useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'

export default function ExportButton({ report }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleExport = async () => {
    if (!report || loading) return
    setLoading(true)
    try {
      const resp = await axios.post('http://localhost:8000/export-pdf', report, {
        responseType: 'blob'
      })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'medsyn_clinical_brief.pdf'
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      console.error('PDF export failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.button
      onClick={handleExport}
      disabled={!report || loading}
      className="clay-btn-peach w-full text-center disabled:opacity-40 disabled:cursor-not-allowed text-sm font-black"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      animate={done ? { scale: [1, 1.05, 1] } : {}}
    >
      {loading ? '⏳ Generating PDF...' : done ? '✅ Downloaded!' : '📄 Export Clinical Brief (PDF)'}
    </motion.button>
  )
}
