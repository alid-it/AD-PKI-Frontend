// src/api/tsa.ts

import api from './client'

export interface TSAStatus {
  exists: boolean
  common_name?: string
  valid_from?: string
  valid_to?: string
  serial?: string
  tsa_url?: string | null
  intermediate_id?: string | null
}

export const getTSAStatus = async (): Promise<TSAStatus> => {
  const res = await api.get('/tsa/status')
  return res.data
}

export const generateTSACert = async (intermediateId: string): Promise<void> => {
  console.log('TSA Intermediate:', intermediateId)

  await api.post('/tsa/generate', {
    intermediate_id: intermediateId
  })
}