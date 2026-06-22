export interface CreateCertificatePayload {
  type: 'tls' | 'client' | 'codesign'
  cn: string
  organization?: string
  ou?: string
  locality?: string
  state?: string
  country?: string
  email?: string
  san_dns: string[]
  san_ips: string[]

  // 🔥 RSA
  key_size: number

  // 🔥 NEU
  key_type: 'rsa' | 'ecdsa'
  curve?: 'P256' | 'P384' | 'P521'

  parent_id: number | null
}
export interface CertificateCreateResponse {
  success: boolean
  message?: string
}