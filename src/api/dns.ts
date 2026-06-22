// src/api/dns.ts

import api from './client'

export interface DnsLookupResult {
  hostname: string
  resolved: boolean
  ip: string | null
  server: string
}

export const lookupDns = async (hostname: string): Promise<DnsLookupResult> => {
  const res = await api.post('/dns/lookup', { hostname })
  return res.data
}