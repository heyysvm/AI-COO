import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { useAuthStore } from './store/auth.store'

import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Inventory } from './pages/Inventory'
import { Finance } from './pages/Finance'
import { Customers } from './pages/Customers'
import { Orders } from './pages/Orders'
import { AIChat } from './pages/AIChat'
import { VoiceAgent } from './pages/VoiceAgent'
import { Settings } from './pages/Settings'

import ProtectedRoute from './components/layout/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import AuthLayout from './components/layout/AuthLayout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

import api from './services/api'

export default function App() {
  const [appLoading, setAppLoading] = useState(true)
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage)

  useEffect(() => {
    loadFromStorage()
    const timer = setTimeout(() => {
      setAppLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [loadFromStorage])

  useEffect(() => {
    const ping = () => {
      api.get('/dashboard/notifications').catch(() => {})
    }
    ping()
    const interval = setInterval(ping, 300000)
    return () => clearInterval(interval)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {appLoading && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col items-center justify-center pointer-events-none select-none animate-fade-out-overlay">
          <div className="relative flex flex-col items-center">
            {/* Split Logo Text */}
            <div className="flex items-center text-5xl font-extrabold tracking-wider mb-6 text-white">
              <span className="animate-logo-split-left gradient-text-split-left pr-1">AI</span>
              <span className="animate-logo-split-right gradient-text-split-right pl-1">COO</span>
            </div>
            
            {/* Loader Bar container */}
            <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-accent to-[#a78bfa] shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-loader-bar" />
            </div>
          </div>
        </div>
      )}
      <HashRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/chat" element={<AIChat />} />
            <Route path="/voice-agent" element={<VoiceAgent />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-surface border border-white/5 text-text-primary rounded-xl font-medium text-xs',
          duration: 4000,
        }}
      />
    </QueryClientProvider>
  )
}
