import api from './api'
import type {
  Customer,
  CreateCustomerRequest,
  CustomerSegmentSummary,
} from '@/types/api.types'

export const customersService = {
  async getAll(): Promise<Customer[]> {
    const response = await api.get<Customer[]>('/customers')
    return response.data
  },

  async getById(id: string): Promise<Customer> {
    const response = await api.get<Customer>(`/customers/${id}`)
    return response.data
  },

  async create(data: CreateCustomerRequest): Promise<Customer> {
    const response = await api.post<Customer>('/customers', data)
    return response.data
  },

  async update(id: string, data: Partial<CreateCustomerRequest>): Promise<Customer> {
    const response = await api.put<Customer>(`/customers/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`)
  },

  async getSegmentSummary(): Promise<CustomerSegmentSummary[]> {
    const response = await api.get<CustomerSegmentSummary[]>(
      '/customers/segments/summary'
    )
    return response.data
  },
}
