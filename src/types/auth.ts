export interface LoginPayload {
  username: string
  password: string
}

export interface AuthUser {
  id: number
  username: string
  firstname?: string
  lastname?: string
  email: string
  role?: string
  permissions: string[]
}


export interface LoginResponse {
  token: string
  user: AuthUser
}
