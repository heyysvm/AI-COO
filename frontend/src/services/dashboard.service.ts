import api from './api'
import type { DashboardOverview } from '@/types/api.types'

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const response = await api.get<DashboardOverview>('/dashboard/overview')
    return response.data
  },
}
