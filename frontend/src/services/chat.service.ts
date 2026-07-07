import api from './api'
import type { ChatMessage, ChatRequest, ChatResponse } from '@/types/api.types'

export const chatService = {
  async sendMessage(data: ChatRequest): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/chat', data)
    return response.data
  },

  async getHistory(conversationId?: string): Promise<ChatMessage[]> {
    const params = conversationId ? { conversation_id: conversationId } : {}
    const response = await api.get<ChatMessage[]>('/chat/history', { params })
    return response.data
  },

  async clearHistory(): Promise<void> {
    await api.delete('/chat/history')
  },

  async seedData(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/seed')
    return response.data
  },
}
