import { create } from 'zustand'

interface AppState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
