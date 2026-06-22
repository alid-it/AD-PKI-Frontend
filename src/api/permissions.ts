import api from './client'
import type { Role } from '@/types/role'
import type { Permission, UserPermissionResponse  } from '@/types/permission'

export const getPermissions = async (): Promise<Permission[]> => {
  const res = await api.get('/permissions')
  return res.data
}

export const getUserPermissions = async (
  userId: number
): Promise<UserPermissionResponse> => {
  const res = await api.get(`/users/${userId}/permissions`)
  return res.data
}

export const saveUserPermissions = async (userId: number, permissions: number[]) => {
  await api.post(`/users/${userId}/permissions`, {
    permissions
  })
}

export const saveRolePermissions = async (roleId: number, permissions: number[]) => {
  await api.post(`/roles/${roleId}/permissions`, {
    permissions
  })
}

export const createRole = async (name: string): Promise<{ success: boolean; role: Role }> => {
  const res = await api.post('/roles', { name })
  return res.data
}

export const deleteRole = async (roleId: number): Promise<{ success: boolean }> => {
  const res = await api.delete(`/roles/${roleId}`)
  return res.data
}