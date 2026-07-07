import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
}

export default function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('space-y-6', className)}
    >
      {children}
    </motion.div>
  )
}
