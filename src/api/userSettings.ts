import api from './client'

export async function getUserSettings() {
  const response = await api.get('/user/settings')
  return response.data
}

export async function updateUserSettings(payload: { locale: string }) {
  const response = await api.put('/user/settings', payload)
  return response.data
}