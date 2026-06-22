export interface Certificate {
  id: number
  cn?: string
  common_name?: string
  san?: string
  serial_number: string
  type?: string
  is_acme: boolean
  revoked: boolean
  revoked_at?: string
  valid_to: string
  expires_in_days: number
  status: string
  has_key?: boolean
  team_id?: number | null
  team_name?: string | null

  // 🔥 NEU (GENAU DAS FEHLT)
  key_type?: 'rsa' | 'ecdsa'
  key_size?: number
  curve?: string
}