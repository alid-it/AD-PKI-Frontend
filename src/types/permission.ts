export interface Permission {
  id: number
  key: string
  label: string
  group: string
}

export interface UserPermissionResponse {
  role_permissions: number[]
  user_permissions: number[]
}