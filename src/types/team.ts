// src/types/team.ts

export interface Team {
  id: number
  name: string
  description: string | null
  users_count?: number
  certificates_count?: number
}