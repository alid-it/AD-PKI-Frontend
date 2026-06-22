import api from './client'

export interface ACMEAccount {
  id: string
  status: string
  contact: string[]
  created_at: string
}

export const getACMEAccounts = async (): Promise<ACMEAccount[]> => {
  const res = await api.get('/acme/accounts')
  return res.data ?? []
}

export const getACMEAccountDomains = async (): Promise<Record<string, string[]>> => {
  const res = await api.get('/acme/account-domains')
  return res.data ?? {}
}

export const deactivateACMEAccount = async (id: string): Promise<void> => {
  await api.post(`/acme/accounts/${id}/deactivate`)
}