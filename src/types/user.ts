// src/types/user.ts

export interface User {
  id: number
  username: string
  firstname: string
  lastname: string
  email: string
  role?: string | null
  role_id?: number
  team_id?: number | null
  team?: {
    id: number
    name: string
  } | null
  locale?: string | null
}