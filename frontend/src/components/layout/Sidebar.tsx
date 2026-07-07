import { useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Sparkles,
  Camera,
  Loader2,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import { useAuthStore } from '@/store/auth.store'
import { useAppStore } from '@/store/app.store'
import { useScanStore } from '@/store/scan.store'


const sidebarVariants = {
  expanded: { width: 260 },
  collapsed: { width: 72 },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' as const },
  }),
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebarCollapsed } = useAppStore()
  const { uploadAndScan, scanning } = useScanStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleScanClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAndScan(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }


  return (
    <motion.aside
      variants={sidebarVariants}
      animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/5 bg-surface/80 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap text-xl font-bold gradient-text"
            >
              AI COO
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item, i) => (
          <motion.div
            key={item.path}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            custom={i}
          >
            <NavLink
              to={item.path}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-accent/10 text-accent-hover'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                      transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive
                        ? 'text-accent-hover'
                        : 'text-text-muted group-hover:text-text-secondary'
                    )}
                  />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          </motion.div>
        ))}

        {/* Scan Document Action */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          custom={NAV_ITEMS.length}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={handleScanClick}
            disabled={scanning}
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50',
              'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            )}
          >
            {scanning ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent" />
            ) : (
              <Camera className="h-5 w-5 shrink-0 text-text-muted group-hover:text-text-secondary" />
            )}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap text-left"
                >
                  {scanning ? 'Scanning...' : 'Scan Document'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </nav>


      {/* Bottom Section */}
      <div className="border-t border-white/5 p-3">
        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebarCollapsed}
          className="mb-3 flex w-full items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
            {user ? getInitials(user.full_name) : 'U'}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-hidden"
              >
                <p className="truncate text-sm font-medium text-text-primary">
                  {user?.full_name ?? 'User'}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {user?.email ?? 'user@example.com'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
