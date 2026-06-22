// src/stores/toastSettings.ts

import { ref, computed } from 'vue'
import { getSetting, setSetting } from '@/api/settings'
import { getPreference, setPreference } from '@/api/preferences'

// =========================================
// 🔥 Globaler Toast Settings Store
// =========================================

// 🔥 Globale Einstellung (Admin) — aus settings Tabelle
export const toastEnabled = ref(true)

// 🔥 User-Präferenz — aus user_preferences Tabelle
export const userToastEnabled = ref(true)

// 🔥 Beide müssen aktiv sein damit Toasts erscheinen
export const toastActive = computed(() =>
  toastEnabled.value && userToastEnabled.value
)

export const toastSettingsLoaded = ref(false)

// 🔥 Globale Einstellung laden (für App.vue + NotificationsView)
export const loadToastSettings = async () => {
  try {
    const val = await getSetting('toast_enabled')
    toastEnabled.value = val !== '0'
  } catch {
    toastEnabled.value = true
  } finally {
    toastSettingsLoaded.value = true
  }
}

// 🔥 User-Präferenz laden (für MeView + App.vue)
export const loadUserToastPreference = async () => {
  try {
    const val = await getPreference('toast_enabled')
    // 🔥 null = noch nie gesetzt → Default aktiv
    userToastEnabled.value = val !== '0'
  } catch {
    userToastEnabled.value = true
  }
}

// 🔥 Beide laden
export const loadAllToastSettings = async () => {
  await Promise.all([
    loadToastSettings(),
    loadUserToastPreference(),
  ])
}

// 🔥 Globale Einstellung speichern
export const saveToastEnabled = async (enabled: boolean) => {
  toastEnabled.value = enabled
  await setSetting('toast_enabled', enabled ? '1' : '0')
}

// 🔥 User-Präferenz speichern
export const saveUserToastPreference = async (enabled: boolean) => {
  userToastEnabled.value = enabled
  await setPreference('toast_enabled', enabled ? '1' : '0')
}