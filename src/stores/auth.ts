// src/stores/auth.ts
import { computed, ref } from 'vue'

import type { AuthUser } from '@/types/auth'

const storedUser = localStorage.getItem('user')

let parsedUser: AuthUser | null = null

try {
  parsedUser = storedUser ? JSON.parse(storedUser) : null
} catch {
  localStorage.removeItem('user')
  localStorage.removeItem('permissions')
}

export const currentUser = ref<AuthUser | null>(parsedUser)

export const permissions = computed<string[]>(() => {
  return currentUser.value?.permissions ?? []
})

export const setUser = (user: AuthUser) => {
  const normalizedUser: AuthUser = {
    ...user,
    permissions: [...(user.permissions ?? [])],
  }

  currentUser.value = normalizedUser

  localStorage.setItem(
    'user',
    JSON.stringify(normalizedUser)
  )

  localStorage.setItem(
    'permissions',
    JSON.stringify(normalizedUser.permissions ?? [])
  )
}

export const clearUser = () => {
  currentUser.value = null

  localStorage.removeItem('user')
  localStorage.removeItem('permissions')
  localStorage.removeItem('token')
}

export const initAuthStorageSync = () => {
  window.addEventListener('storage', (event) => {
    if (event.key === 'user') {
      if (!event.newValue) {
        currentUser.value = null
        return
      }

      try {
        const user = JSON.parse(event.newValue) as AuthUser

        currentUser.value = {
          ...user,
          permissions: [...(user.permissions ?? [])],
        }
      } catch {
        currentUser.value = null
      }
    }

    if (event.key === 'token' && !event.newValue) {
      currentUser.value = null
    }
  })
}