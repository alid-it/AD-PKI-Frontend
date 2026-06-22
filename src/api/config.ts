// src/api/config.ts

import api from './client'
import type { ReverbConfig } from '@/types/config'

export const getReverbConfig = async (): Promise<ReverbConfig> => {
  const res = await api.get('/config')
  return res.data
}