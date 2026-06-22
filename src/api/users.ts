// src/api/users.ts

import api from './client'
import type { User } from '@/types/user'

export interface CreateUserPayload {
  username: string
  firstname: string
  lastname: string
  email: string
  password: string
  password_confirmation: string
  role_id: number
  team_id?: number | null
  locale?: string | null
}

export interface UpdateUserPayload {
  username: string
  firstname: string
  lastname: string
  email: string
  role_id: number
  team_id?: number | null
  locale?: string | null
  password?: string
  password_confirmation?: string
}

export const getUsers = async (): Promise<User[]> => {
  const res = await api.get('/users')
  return res.data
}

export const createUser = async (payload: CreateUserPayload) => {
  const res = await api.post('/users', payload)
  return res.data
}

export const updateUser = async (id: number, payload: UpdateUserPayload) => {
  const res = await api.put(`/users/${id}`, payload)
  return res.data
}

export const deleteUser = async (id: number) => {
  await api.delete(`/users/${id}`)
}