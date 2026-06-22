import api from './client'

export const getSetting = async (key: string) => {
  const res = await api.get(`/settings/${key}`)
  return res.data.value
}

export const setSetting = async (key: string, value: string) => {
  await api.post(`/settings`, { key, value: String(value) })  // 🔥
}


export const setNtpServer = async (ntpServer: string) => {
  const res = await api.post(`/system/ntp`, {
    ntp_server: ntpServer,
  })

  return res.data
}