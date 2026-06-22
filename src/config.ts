interface AppConfig {
  apiBaseUrl: string
  defaultLocale: string
}

declare global {
  interface Window {
    __ADPKI_CONFIG__?: {
      apiBaseUrl?: string
      defaultLocale?: string
    }
  }
}

const cfg = window.__ADPKI_CONFIG__

export const config: AppConfig = {
  apiBaseUrl: cfg?.apiBaseUrl ?? 'http://127.0.0.1:8000/api',
  defaultLocale: cfg?.defaultLocale ?? 'de',
}