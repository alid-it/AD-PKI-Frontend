export interface ExpiringCert {
  cn: string
  expires_in_days: number
  status: string
}

export interface DashboardData {
  total_certificates: number
  expiring_soon: number
  revoked: number
  acme_active: boolean
  ca: {
    root: string
    intermediates: string[]
  }
  system: {
    acme: boolean
    crl: boolean
    ocsp: boolean
  }
  expiring: ExpiringCert[]
}