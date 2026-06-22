import api from './client'
import type { NotificationSettings, NotificationEvent, NotificationEventUpdate } from '@/types/notification'

export const getNotifications = async (): Promise<{
  settings: NotificationSettings
  events: NotificationEvent[]
  variables: Record<string, Record<string, Record<string, string>>>
}> => {
  const res = await api.get('/notifications')
  return res.data
}

export const saveNotificationSettings = async (data: NotificationSettings) => {
  await api.post('/notifications/settings', data)
}

export const saveNotificationEvents = async (events: NotificationEventUpdate[]) => {
  await api.post('/notifications/events', { events })
}

export const testNotification = async (channel: string, data?: any) => {
  await api.post(`/notifications/test/${channel}`, data)
}

export const saveRecipients = async (id: number, roles: string[]) => {
  await api.post(`/notifications/events/${id}/recipients`, { roles })
}


