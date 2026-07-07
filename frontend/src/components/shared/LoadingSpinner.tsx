import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function LoadingSpinner({
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
  }

  const gapMap = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  }

  return (
    <div className={cn('flex items-center justify-center', gapMap[size], className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-accent', sizeMap[size])}
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
