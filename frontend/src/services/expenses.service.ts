import api from './api'
import type {
  Expense,
  CreateExpenseRequest,
  ExpenseStatsSummary,
} from '@/types/api.types'

export const expensesService = {
  async getAll(): Promise<Expense[]> {
    const response = await api.get<Expense[]>('/expenses')
    return response.data
  },

  async getById(id: string): Promise<Expense> {
    const response = await api.get<Expense>(`/expenses/${id}`)
    return response.data
  },

  async create(data: CreateExpenseRequest): Promise<Expense> {
    const response = await api.post<Expense>('/expenses', data)
    return response.data
  },

  async update(id: string, data: Partial<CreateExpenseRequest>): Promise<Expense> {
    const response = await api.put<Expense>(`/expenses/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`)
  },

  async getStatsSummary(): Promise<ExpenseStatsSummary> {
    const response = await api.get<ExpenseStatsSummary>('/expenses/stats/summary')
    return response.data
  },
}
