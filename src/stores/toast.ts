// src/stores/toast.ts

import { ref } from 'vue'

export type ToastType = 'success' | 'danger' | 'warning' | 'info'

export interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
  icon?: string
  duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 1

export const useToast = () => {

  const add = (toast: Omit<Toast, 'id'>) => {
    const id = nextId++
    const duration = toast.duration ?? 5000

    toasts.value.push({ ...toast, id })

    // 🔥 Auto-remove
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
  }

  const remove = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) toasts.value.splice(index, 1)
  }

  // 🔥 Convenience Methoden
  const success = (title: string, message?: string) => add({ type: 'success', icon: '✅', title, message })
  const danger  = (title: string, message?: string) => add({ type: 'danger',  icon: '🚫', title, message })
  const warning = (title: string, message?: string) => add({ type: 'warning', icon: '⚠️', title, message })
  const info    = (title: string, message?: string) => add({ type: 'info',    icon: '🔔', title, message })

  return { toasts, add, remove, success, danger, warning, info }
}