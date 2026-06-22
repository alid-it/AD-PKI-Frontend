import apiClient from './client'

import type { Certificate } from '@/types/certificate'
import type { PaginationMeta } from '@/types/api'

// 🔥 API Response
export interface CertificateResponse {
  data: Certificate[]
  meta: PaginationMeta
}

// 🔥 GET
export const getCertificates = async (
  page = 1,
  search = '',
  status = ''
): Promise<CertificateResponse> => {
  const res = await apiClient.get<CertificateResponse>(
    `/certificates?page=${page}&search=${search}&status=${status}`
  )

  return res.data
}

// 🔥 DOWNLOAD CRT
export const downloadCert = async (cert: Certificate) => {
  const res = await apiClient.get(
    `/certificates/${cert.id}/download?type=crt`,
    { responseType: 'blob' }
  )

  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url

  link.setAttribute(
    'download',
    `${cert.cn || cert.common_name || 'certificate'}.crt`
  )

  document.body.appendChild(link)
  link.click()
}

// 🔥 DOWNLOAD KEY
export const downloadKey = async (cert: Certificate) => {
  const res = await apiClient.get(
    `/certificates/${cert.id}/download?type=key`,
    { responseType: 'blob' }
  )

  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url

  link.setAttribute(
    'download',
    `${cert.cn || cert.common_name || 'certificate'}-${cert.serial_number}.key`
  )

  document.body.appendChild(link)
  link.click()
}

export const downloadP12 = async (cert: Certificate) => {
  const res = await apiClient.get(
    `/certificates/${cert.id}/download-p12`,
    { responseType: 'blob' }
  )

  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url

  link.setAttribute(
    'download',
    `${cert.cn || cert.common_name}.p12`
  )

  document.body.appendChild(link)
  link.click()
}

export const assignCertificateTeam = async (id: number, teamId: number | null) => {
  await apiClient.patch(`/certificates/${id}/team`, { team_id: teamId })
}

