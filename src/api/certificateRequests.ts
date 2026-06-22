// src/api/certificateRequests.ts

import apiClient from './client'
import type { Certificate } from '@/types/certificate'

export const getCertificateRequests = async (): Promise<Certificate[]> => {
  const res = await apiClient.get('/certificate-requests')
  return res.data
}

export const approveRequest = async (id: number): Promise<void> => {
  await apiClient.post(`/certificate-requests/${id}/approve`)
}

export const rejectRequest = async (id: number, reason: string): Promise<void> => {
  await apiClient.post(`/certificate-requests/${id}/reject`, { reason })
}