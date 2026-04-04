import { motion } from 'framer-motion'

const variantMap = {
  white: 'bg-white',
  lavender: 'bg-clay-lavender',
  mint: 'bg-clay-mint',
  peach: 'bg-clay-peach',
  sky: 'bg-clay-sky',
  rose: 'bg-clay-rose',
  yellow: 'bg-clay-yellow',
}

export default function ClayCard({ children, variant = 'white', className = '', animate = true, onClick, ...props }) {
  const bg = variantMap[variant] || 'bg-white'
  const base = `rounded-clay border-[3px] border-black shadow-clay ${bg} ${className}`

  if (!animate) {
    return <div className={base} onClick={onClick} {...props}>{children}</div>
  }

  return (
    <motion.div
      className={base}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      whileHover={onClick ? { y: -3, scale: 1.01 } : { y: -2 }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  )
}
