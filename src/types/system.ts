export interface Service {
  version?: string
  status: string
}

export interface HealthResponse {
  status: string
  services: Record<string, Service>
}

export interface SystemInfoItem {
  component: string
  version: string
  url?: string
  detail?: string
}