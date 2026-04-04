import { useState } from 'react'
import axios from 'axios'

export default function ExportButton({ report }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleExport = async () => {
    if (!report || loading) return
    setLoading(true)
    try {
      const resp = await axios.post('http://localhost:8000/export-pdf', report, { responseType: 'blob' })
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
    <button
      onClick={handleExport}
      disabled={!report || loading}
      className="btn-primary w-full text-sm flex items-center justify-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {loading ? 'Generating PDF...' : done ? 'Downloaded' : 'Export Clinical Brief (PDF)'}
    </button>
  )
}
