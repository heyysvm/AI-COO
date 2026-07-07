import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Camera, Loader2 } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAppStore } from '@/store/app.store'
import { useScanStore } from '@/store/scan.store'
import { ScanVerificationModal } from '@/components/shared/ScanVerificationModal'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' as const } },
}

export default function DashboardLayout() {
  const location = useLocation()
  const { sidebarCollapsed } = useAppStore()
  const queryClient = useQueryClient()
  const { scanning, isModalOpen, scanType, extractedData, setIsModalOpen } = useScanStore()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className="flex flex-1 flex-col transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
      >
        <Header />
        <main className="flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mx-auto w-full max-w-7xl p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Dynamic scan verification modal */}
      <ScanVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        scanType={scanType}
        extractedData={extractedData}
        onSuccess={() => {
          queryClient.invalidateQueries()
          toast.success('Charts & metrics successfully updated!')
        }}
      />

      {/* Laser line scanning overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md p-6">
          <div className="relative w-64 h-64 border border-accent/30 rounded-2xl overflow-hidden flex items-center justify-center bg-[#0a0a0f]/40 shadow-[0_0_50px_rgba(99,102,241,0.25)]">
            <div className="absolute left-0 right-0 h-[3px] bg-accent shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-laser-scan z-10" />
            <Camera className="w-16 h-16 text-accent/20 animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-text-primary mt-6 tracking-wide flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" /> Gemini OCR is reading document...
          </h3>
          <p className="text-[11px] text-text-secondary mt-1.5 max-w-xs text-center leading-relaxed">
            Extracting text, categories, numbers, and validating schemas automatically.
          </p>
        </div>
      )}
    </div>
  )
}

