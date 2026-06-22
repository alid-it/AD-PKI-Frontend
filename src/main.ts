import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { refreshCurrentUser } from '@/utils/auth'
import { initAuthStorageSync } from '@/stores/auth'
import { initEcho } from '@/echo'
import { i18n } from '@/i18n'
import { applyBranding, getActiveMode } from '@/utils/branding'


// 🔥 Global Styles
import '@/assets/styles/global/layout.css'
import '@/assets/styles/global/navbar.css'
import '@/assets/styles/global/BaseButton.css'
import '@/assets/styles/global/BaseCard.css'
import '@/assets/styles/global/BaseTable.css'
import '@/assets/styles/global/BaseInput.css'
import '@/assets/styles/global/theme.css'
import '@/assets/styles/global/responsive.css'

// Modus (light/dark) bestimmen und Branding-Farben fuer diesen Modus anwenden.
// data-theme steuert alle uebrigen Variablen aus theme.css,
// applyBranding ueberschreibt nur die 8 konfigurierbaren Marken-/Strukturfarben.
const initTheme = () => {
  const mode = getActiveMode()
  document.documentElement.setAttribute('data-theme', mode)
  applyBranding(mode)
}

initTheme()

// =========================================
// INIT AUTH
// =========================================

const token = localStorage.getItem('token')

if (token) {
  try {
    await refreshCurrentUser()

    // 🔥 Echo sofort initialisieren damit WebSocket bereit ist
    // bevor Views mounten und bus.on() registrieren
    await initEcho()

  } catch (error) {
    console.error('Initiale Auth-Synchronisierung fehlgeschlagen:', error)
  }
}

const app = createApp(App)
app.use(router)
initAuthStorageSync()
app.use(i18n)
app.mount('#app')