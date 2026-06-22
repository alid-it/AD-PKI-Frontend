import apiClient from './client'

import type { Certificate } from '@/types/certificate'
import type { PaginationMeta } from '@/types/api'

// 🔥 Response
export interface RevokeResponse {
  success: boolean
  message?: string
}

// 🔥 GET Certificates (für revoke view)
export const getCertificates = async (
  page = 1
): Promise<{ data: Certificate[]; meta: PaginationMeta }> => {
  const res = await apiClient.get<{ data: Certificate[]; meta: PaginationMeta }>(
    `/certificates?page=${page}`
  )
  return res.data
}

// 🔥 REVOKE
export const revokeCertificate = async (
  id: number,
  reason: string
): Promise<RevokeResponse> => {
  const res = await apiClient.post<RevokeResponse>(
    `/certificates/${id}/revoke`,
    { reason }
  )
  return res.data
}