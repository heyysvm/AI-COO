import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  formattedValue?: string
  change?: number
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet'
  prefix?: string
  suffix?: string
  delay?: number
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    glow: 'shadow-indigo-500/5',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/5',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/5',
    gradient: 'from-amber-500 to-amber-600',
  },
  rose: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-500/5',
    gradient: 'from-rose-500 to-rose-600',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/5',
    gradient: 'from-blue-500 to-blue-600',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
    glow: 'shadow-violet-500/5',
    gradient: 'from-violet-500 to-violet-600',
  },
}

function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration])

  return count
}

export default function StatCard({
  title,
  value,
  formattedValue,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
  prefix = '',
  suffix = '',
  delay = 0,
}: StatCardProps) {
  const animatedValue = useCountUp(value)
  const colors = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-white/5 bg-surface/60 p-5 backdrop-blur-xl transition-shadow duration-300',
        'hover:border-white/10 hover:shadow-lg',
        colors.glow
      )}
    >
      {/* Gradient top border accent */}
      <div
        className={cn(
          'absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r opacity-60 transition-opacity group-hover:opacity-100',
          colors.gradient
        )}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-text-primary">
            {formattedValue ?? `${prefix}${animatedValue.toLocaleString('en-IN')}${suffix}`}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {changeType === 'positive' ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : changeType === 'negative' ? (
                <TrendingDown className="h-3.5 w-3.5 text-danger" />
              ) : null}
              <span
                className={cn(
                  'text-xs font-medium',
                  changeType === 'positive'
                    ? 'text-success'
                    : changeType === 'negative'
                      ? 'text-danger'
                      : 'text-text-muted'
                )}
              >
                {changeType === 'positive' ? '+' : ''}
                {change}%
              </span>
              <span className="text-xs text-text-muted">vs last month</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110',
            colors.bg
          )}
        >
          <Icon className={cn('h-5 w-5', colors.text)} />
        </div>
      </div>
    </motion.div>
  )
}
