import apiClient from './client'
import type { DashboardData } from '@/types/dashboard'

// 🔥 API Call
export const getDashboard = async (): Promise<DashboardData> => {
  const res = await apiClient.get<DashboardData>('/dashboard')
  return res.data
}