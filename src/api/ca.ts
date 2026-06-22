import apiClient from './client'
import type { CAResponse } from '@/types/ca'

// 🔥 API
export const getCA = async (): Promise<CAResponse> => {
  const res = await apiClient.get<CAResponse>('/ca')
  return res.data
}