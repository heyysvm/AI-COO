import api from './api'
import type {
  Order,
  CreateOrderRequest,
  OrderStatsSummary,
} from '@/types/api.types'

export const ordersService = {
  async getAll(): Promise<Order[]> {
    const response = await api.get<Order[]>('/orders')
    return response.data
  },

  async getById(id: string): Promise<Order> {
    const response = await api.get<Order>(`/orders/${id}`)
    return response.data
  },

  async create(data: CreateOrderRequest): Promise<Order> {
    const response = await api.post<Order>('/orders', data)
    return response.data
  },

  async update(id: string, data: Partial<CreateOrderRequest>): Promise<Order> {
    const response = await api.put<Order>(`/orders/${id}`, data)
    return response.data
  },

  async getStatsSummary(): Promise<OrderStatsSummary> {
    const response = await api.get<OrderStatsSummary>('/orders/stats/summary')
    return response.data
  },
}
