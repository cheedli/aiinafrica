import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const variantMap = {
  peach: 'bg-clay-peach',
  sky: 'bg-clay-sky',
  mint: 'bg-clay-mint',
  lavender: 'bg-clay-lavender',
}

export default function UploadZone({ label, icon, variant = 'peach', accept, multiple = false, onFiles }) {
  const inputRef = useRef()
  const [dragOver, setDragOver] = useState(false)
  const [files, setFiles] = useState([])

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    setFiles(arr)
    onFiles(arr)
  }

  const bg = variantMap[variant] || 'bg-clay-peach'

  return (
    <div className={`rounded-clay border-[3px] border-black shadow-clay ${bg} p-4 flex flex-col gap-3`}>
      <motion.div
        className={`flex flex-col items-center justify-center min-h-[120px] rounded-xl border-2 border-dashed border-black/30 p-4 cursor-pointer transition-colors ${dragOver ? 'bg-black/10' : 'bg-white/20'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.span
          className="text-4xl mb-2"
          animate={{ y: dragOver ? -6 : 0 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          {icon}
        </motion.span>
        <span className="font-bold text-sm text-center">{label}</span>
        <span className="text-xs text-black/50 mt-1">Drop or click to upload</span>
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1"
          >
            {files.map((f, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="clay-pill bg-white text-xs max-w-[140px] truncate"
              >
                {f.name}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
