import { create } from 'zustand'
import api from '@/services/api'

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface Briefing {
  title: string
  message: string
  timestamp: string
}

export interface AiBriefings {
  morning: Briefing
  noon: Briefing
  evening: Briefing
  night: Briefing
}

interface NotificationState {
  notifications: Notification[]
  loading: boolean
  aiNotifications: Notification[]
  aiBriefings: AiBriefings | null
  aiLoading: boolean
  fetchNotifications: () => Promise<void>
  fetchAiNotifications: () => Promise<void>
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}

const READ_IDS_KEY = 'aicoo_read_notification_ids'
const CLEARED_IDS_KEY = 'aicoo_cleared_notification_ids'

const getStoredIds = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const saveStoredIds = (key: string, ids: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save notification states', e)
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  aiNotifications: [],
  aiBriefings: null,
  aiLoading: false,

  fetchNotifications: async () => {
    set({ loading: true })
    try {
      const response = await api.get<Omit<Notification, 'read'>[]>('/dashboard/notifications')
      const readIds = getStoredIds(READ_IDS_KEY)
      const clearedIds = getStoredIds(CLEARED_IDS_KEY)

      const mapped: Notification[] = response.data
        .filter((item) => !clearedIds.includes(item.id))
        .map((item) => ({
          ...item,
          read: readIds.includes(item.id),
        }))

      set({ notifications: mapped, loading: false })
    } catch (err) {
      console.error('Failed to fetch notifications', err)
      set({ loading: false })
    }
  },

  fetchAiNotifications: async () => {
    set({ aiLoading: true })
    try {
      const response = await api.get<{
        irregularities: Omit<Notification, 'read'>[]
        briefings: AiBriefings
      }>('/dashboard/ai-notifications')

      const readIds = getStoredIds(READ_IDS_KEY)
      const clearedIds = getStoredIds(CLEARED_IDS_KEY)

      const irregularities = response.data.irregularities || []
      const briefings = response.data.briefings || null

      const mappedIrregularities: Notification[] = irregularities
        .filter((item) => !clearedIds.includes(item.id))
        .map((item) => ({
          ...item,
          read: readIds.includes(item.id),
        }))

      set({
        aiNotifications: mappedIrregularities,
        aiBriefings: briefings,
        aiLoading: false,
      })
    } catch (err) {
      console.error('Failed to fetch AI notifications', err)
      set({ aiLoading: false })
    }
  },

  markAsRead: (id) => {
    const readIds = getStoredIds(READ_IDS_KEY)
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id]
      saveStoredIds(READ_IDS_KEY, newReadIds)
    }

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      aiNotifications: state.aiNotifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }))
  },

  markAllAsRead: () => {
    const { notifications, aiNotifications } = get()
    const readIds = getStoredIds(READ_IDS_KEY)
    const newReadIds = [...readIds]

    notifications.forEach((n) => {
      if (!newReadIds.includes(n.id)) newReadIds.push(n.id)
    })
    aiNotifications.forEach((n) => {
      if (!newReadIds.includes(n.id)) newReadIds.push(n.id)
    })

    saveStoredIds(READ_IDS_KEY, newReadIds)

    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      aiNotifications: state.aiNotifications.map((n) => ({ ...n, read: true })),
    }))
  },

  clearAll: () => {
    const { notifications, aiNotifications } = get()
    const clearedIds = getStoredIds(CLEARED_IDS_KEY)
    const newClearedIds = [...clearedIds]

    notifications.forEach((n) => {
      if (!newClearedIds.includes(n.id)) newClearedIds.push(n.id)
    })
    aiNotifications.forEach((n) => {
      if (!newClearedIds.includes(n.id)) newClearedIds.push(n.id)
    })

    saveStoredIds(CLEARED_IDS_KEY, newClearedIds)
    set({ notifications: [], aiNotifications: [] })
  },
}))
