import api from './client'
import type { Role } from '@/types/role'

export const getRoles = async (): Promise<Role[]> => {
  const res = await api.get('/roles')
  return res.data
}