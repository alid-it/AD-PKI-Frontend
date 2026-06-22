import apiClient from './client'
import type { AuditLogResponse } from '@/types/auditlog'

export interface AuditLogFilters {
  action?: string
  user_id?: number
  date_from?: string
  date_to?: string
  per_page?: number
  page?: number
}

export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLogResponse> => {
  const res = await apiClient.get('/audit-logs', { params: filters })
  return res.data
}

export const getAuditLogActions = async (): Promise<string[]> => {
  const res = await apiClient.get('/audit-logs/actions')
  return res.data
}