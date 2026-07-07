import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { PackageOpen, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-white/5 bg-surface/40 px-8 py-16 text-center backdrop-blur-sm',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-hover">
        <Icon className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-text-muted">{description}</p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-shadow hover:shadow-indigo-500/30"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}
