import apiClient from './client'
import type { Template } from '@/types/template'

// 🔥 GET
export const getTemplates = async (): Promise<Template[]> => {
  const res = await apiClient.get<Template[]>('/templates')
  return res.data
}

// 🔥 CREATE / SAVE
export const saveTemplate = async (
  data: Omit<Template, 'id'>
): Promise<Template> => {
  const res = await apiClient.post<Template>('/templates', data)
  return res.data
}

// 🔥 DELETE
export const deleteTemplate = async (id: number): Promise<void> => {
  await apiClient.delete(`/templates/${id}`)
}