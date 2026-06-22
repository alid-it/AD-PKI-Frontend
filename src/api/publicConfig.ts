import api from './client'

export async function getPublicConfig() {
  const response = await api.get('/public/config')

  return response.data
}