import apiClient from './client'

import type {
  CreateCertificatePayload,
  CertificateCreateResponse
} from '@/types/certificateCreate'

// 🔥 CREATE FROM DATA
export const createCertificateFromData = async (
  data: CreateCertificatePayload
): Promise<CertificateCreateResponse> => {
  const res = await apiClient.post<CertificateCreateResponse>(
    '/certificates/from-data',
    data
  )
  return res.data
}

// 🔥 CREATE FROM CSR
export const createCertificateFromCSR = async (
  csr: string,
  type: 'tls' | 'client' | 'codesign',
  parent_id: number | null = null,
  teamId?: number | null
): Promise<CertificateCreateResponse> => {
  const formData = new FormData()

  formData.append(
    'csr',
    new Blob([csr], { type: 'text/plain' }),
    'request.csr'
  )

  formData.append('type', type) // 🔥 DAS IST DER FIX

  if (parent_id) {
    formData.append('intermediate', String(parent_id))
  }
  if (teamId)   formData.append('team_id', String(teamId))   // 🔥 NEU


  const res = await apiClient.post<CertificateCreateResponse>(
    '/certificates',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )

  return res.data
}