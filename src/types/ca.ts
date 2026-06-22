export interface CACertificate {
  id: number
  cn: string
  valid_to: string
  serial_number: string
  status: string
}

export interface CAResponse {
  root: CACertificate
  intermediates: CACertificate[]
}

