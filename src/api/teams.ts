// src/api/teams.ts

import api from './client'
import type { Team } from '@/types/team'

export const getTeams = async (): Promise<Team[]> => {
  const res = await api.get('/teams')
  return res.data
}

export const createTeam = async (payload: { name: string; description?: string }) => {
  const res = await api.post('/teams', payload)
  return res.data
}

export const updateTeam = async (id: number, payload: { name: string; description?: string }) => {
  const res = await api.put(`/teams/${id}`, payload)
  return res.data
}

export const deleteTeam = async (id: number) => {
  await api.delete(`/teams/${id}`)
}