import api from './client'
import type { HealthResponse, SystemInfoItem } from '@/types/system'

export const getSystemHealth = async (): Promise<HealthResponse> => {
  const res = await api.get('/system/health')
  return res.data
}

export const getSystemInfo = async (): Promise<SystemInfoItem[]> => {
  const res = await api.get('/system/info')
  return res.data
}