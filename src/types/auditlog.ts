export interface AuditLog {
  id: number
  log_id: string | null
  username: string
  action: string
  subject_type: string | null
  subject_id: number | null
  ip_address: string | null
  created_at: string
  meta: Record<string, unknown> | null
}

export interface AuditLogMeta {
  current_page: number
  last_page: number
  total: number
}

export interface AuditLogResponse {
  data: AuditLog[]
  meta: AuditLogMeta
}