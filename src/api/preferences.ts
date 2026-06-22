// src/api/preferences.ts

import api from './client'

export const getPreference = async (key: string): Promise<string | null> => {
  const res = await api.get(`/me/preferences/${key}`)
  return res.data.value
}

export const setPreference = async (key: string, value: string): Promise<void> => {
  await api.post('/me/preferences', { key, value })
}