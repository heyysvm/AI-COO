import api from './api'
import type { Product, CreateProductRequest } from '@/types/api.types'

export const productsService = {
  async getAll(): Promise<Product[]> {
    const response = await api.get<Product[]>('/products')
    return response.data
  },

  async getById(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`)
    return response.data
  },

  async create(data: CreateProductRequest): Promise<Product> {
    const response = await api.post<Product>('/products', data)
    return response.data
  },

  async update(id: string, data: Partial<CreateProductRequest>): Promise<Product> {
    const response = await api.put<Product>(`/products/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`)
  },

  async getLowStock(): Promise<Product[]> {
    const response = await api.get<Product[]>('/products/low-stock')
    return response.data
  },
}
