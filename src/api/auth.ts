import apiClient from './client'

import type {
  LoginPayload,
  LoginResponse,
  AuthUser
} from '@/types/auth'

// =========================================
// LOGIN
// =========================================

export const login = async (
  payload: LoginPayload
): Promise<LoginResponse> => {

  const res = await apiClient.post<LoginResponse>(
    '/login',
    payload
  )

  return res.data
}

// =========================================
// ME
// =========================================

export const me = async (): Promise<AuthUser> => {

  const res = await apiClient.get<AuthUser>(
    '/me'
  )

  return res.data
}

// =========================================
// LOGOUT
// =========================================

export const logout = async () => {
  await apiClient.post('/logout')
}