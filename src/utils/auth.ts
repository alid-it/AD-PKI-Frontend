// src/utils/auth.ts
import { me } from '@/api/auth'
import { setUser, clearUser } from '@/stores/auth'

export const refreshCurrentUser = async () => {
  try {
    const user = await me()

    setUser(user)

    return user
  } catch (e) {
    console.error('User konnte nicht synchronisiert werden:', e)

    clearUser()

    throw e
  }
}