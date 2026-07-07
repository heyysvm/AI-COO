import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Gradient orbs */}
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 20, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, 20, -10, 0],
            y: [0, -20, 10, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[80px]"
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Outlet />
      </motion.div>
    </div>
  )
}
