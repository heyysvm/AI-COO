import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, Search, Sun, Moon, Check, Trash2, AlertTriangle, Info, CheckCircle, XCircle, Sparkles, CloudSun, Sunset } from 'lucide-react'
import { ROUTE_TITLES } from '@/lib/constants'
import { useAppStore } from '@/store/app.store'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function Header() {
  const location = useLocation()
  const { toggleSidebar } = useAppStore()
  const { user } = useAuthStore()
  const { 
    notifications, 
    aiNotifications,
    aiBriefings,
    aiLoading,
    fetchNotifications, 
    fetchAiNotifications,
    markAsRead, 
    markAllAsRead, 
    clearAll 
  } = useNotificationStore()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'alerts' | 'briefings'>('alerts')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  )

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
      localStorage.setItem('theme', 'dark')
    }
  }, [theme])

  useEffect(() => {
    fetchNotifications()
    fetchAiNotifications()
    const interval = setInterval(() => {
      fetchNotifications()
      fetchAiNotifications()
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications, fetchAiNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const currentTitle =
    ROUTE_TITLES[location.pathname] ?? 'AI COO'

  const unreadCount = 
    notifications.filter((n) => !n.read).length + 
    aiNotifications.filter((n) => !n.read).length

  // Merge and sort alerts
  const allAlerts = [...notifications, ...aiNotifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-background/60 px-6 backdrop-blur-xl"
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <motion.h1
          key={currentTitle}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg font-semibold text-text-primary"
        >
          {currentTitle}
        </motion.h1>
      </div>

      {/* Center: Search */}
      <div className="hidden max-w-md flex-1 px-8 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full rounded-lg border border-white/5 bg-surface/50 py-2 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted transition-all focus:border-accent/30 focus:outline-none focus:ring-1 focus:ring-accent/20"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ring-2 ring-background">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-80 max-h-[500px] overflow-hidden rounded-xl border border-white/10 bg-surface/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-surface/50">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Notifications
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllAsRead()}
                        className="text-[10px] text-accent hover:text-accent-hover font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mark all as read"
                      >
                        <Check className="h-3 w-3" /> Mark read
                      </button>
                    )}
                    {allAlerts.length > 0 && (
                      <button
                        onClick={() => clearAll()}
                        className="text-[10px] text-text-muted hover:text-danger font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Clear all"
                      >
                        <Trash2 className="h-3 w-3" /> Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 bg-surface/30">
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className={`flex-1 py-2 text-center text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                      activeTab === 'alerts'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Alerts ({allAlerts.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('briefings')}
                    className={`flex-1 py-2 text-center text-xs font-semibold transition-colors cursor-pointer border-b-2 ${
                      activeTab === 'briefings'
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Daily Briefing
                  </button>
                </div>

                {/* Notifications & briefings List */}
                <div className="flex-1 overflow-y-auto max-h-[360px] divide-y divide-white/5">
                  {activeTab === 'alerts' ? (
                    <>
                      {allAlerts.length > 0 ? (
                        allAlerts.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.read && markAsRead(n.id)}
                            className={`flex gap-3 px-4 py-3 transition-colors cursor-pointer ${
                              n.id.startsWith('ai_')
                                ? 'bg-indigo-500/5 hover:bg-indigo-500/10 border-l-2 border-indigo-500/40'
                                : n.read ? 'hover:bg-white/5' : 'bg-accent/5 hover:bg-accent/10'
                            }`}
                          >
                            {/* Type Icon */}
                            <div className="mt-0.5 shrink-0">
                              {n.id.startsWith('ai_') ? (
                                <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                              ) : (
                                <>
                                  {n.type === 'warning' && <AlertTriangle className="h-4 w-4 text-warning" />}
                                  {n.type === 'error' && <XCircle className="h-4 w-4 text-danger" />}
                                  {n.type === 'success' && <CheckCircle className="h-4 w-4 text-success" />}
                                  {n.type === 'info' && <Info className="h-4 w-4 text-accent" />}
                                </>
                              )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-text-primary truncate flex items-center gap-1.5">
                                  {n.title}
                                  {n.id.startsWith('ai_') && (
                                    <span className="text-[8px] bg-indigo-500/25 text-indigo-300 font-bold px-1 rounded border border-indigo-400/20">AI Insight</span>
                                  )}
                                </span>
                                <span className="text-[9px] text-text-muted shrink-0">
                                  {formatRelativeTime(n.timestamp)}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed break-words">
                                {n.message}
                              </p>
                            </div>

                            {/* Unread blue dot */}
                            {!n.read && (
                              <div className="mt-2 shrink-0">
                                <span className="block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-text-secondary text-xs">
                          No notifications
                        </div>
                      )}

                      {aiLoading && (
                        <div className="p-4 space-y-3 animate-pulse border-t border-white/5">
                          <div className="h-3 w-1/3 bg-white/5 rounded" />
                          <div className="h-6 w-full bg-white/5 rounded" />
                          <div className="h-3 w-2/3 bg-white/5 rounded" />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {aiBriefings ? (
                        <div className="p-3 space-y-3">
                          {/* Morning Briefing */}
                          <div className="p-3 rounded-xl border border-white/5 bg-amber-500/5 hover:bg-amber-500/8 transition-colors flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <Sun className="h-4 w-4" /> {aiBriefings.morning.title}
                              </span>
                              <span className="text-[8px] text-text-muted">8:00 AM</span>
                            </div>
                            <p className="text-[11px] text-text-secondary leading-relaxed">
                              {aiBriefings.morning.message}
                            </p>
                          </div>

                          {/* Noon Briefing */}
                          <div className="p-3 rounded-xl border border-white/5 bg-orange-500/5 hover:bg-orange-500/8 transition-colors flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                                <CloudSun className="h-4 w-4" /> {aiBriefings.noon.title}
                              </span>
                              <span className="text-[8px] text-text-muted">12:00 PM</span>
                            </div>
                            <p className="text-[11px] text-text-secondary leading-relaxed">
                              {aiBriefings.noon.message}
                            </p>
                          </div>

                          {/* Evening Briefing */}
                          <div className="p-3 rounded-xl border border-white/5 bg-rose-500/5 hover:bg-rose-500/8 transition-colors flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                                <Sunset className="h-4 w-4" /> {aiBriefings.evening.title}
                              </span>
                              <span className="text-[8px] text-text-muted">6:00 PM</span>
                            </div>
                            <p className="text-[11px] text-text-secondary leading-relaxed">
                              {aiBriefings.evening.message}
                            </p>
                          </div>

                          {/* Night Briefing */}
                          <div className="p-3 rounded-xl border border-white/5 bg-indigo-500/5 hover:bg-indigo-500/8 transition-colors flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <Moon className="h-4 w-4" /> {aiBriefings.night.title}
                              </span>
                              <span className="text-[8px] text-text-muted">10:00 PM</span>
                            </div>
                            <p className="text-[11px] text-text-secondary leading-relaxed">
                              {aiBriefings.night.message}
                            </p>
                          </div>
                        </div>
                      ) : aiLoading ? (
                        <div className="p-4 space-y-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="animate-pulse space-y-2 p-3 rounded-xl bg-white/5">
                              <div className="h-3 w-1/3 bg-white/10 rounded" />
                              <div className="h-6 w-full bg-white/10 rounded" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-text-secondary text-xs">
                          No daily briefings available.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar */}
        <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white ring-2 ring-white/10">
          {user ? getInitials(user.full_name) : 'U'}
        </div>
      </div>
    </motion.header>
  )
}


