import { createI18n } from 'vue-i18n'

import de from '@/locales/de.json'
import en from '@/locales/en.json'
import es from '@/locales/es.json'
import fr from '@/locales/fr.json'
import it from '@/locales/it.json'
import tr from '@/locales/tr.json'

const supportedLocales = ['de', 'en', 'es', 'fr', 'it', 'tr'] as const
type SupportedLocale = typeof supportedLocales[number]

function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
  return !!locale && supportedLocales.includes(locale as SupportedLocale)
}

function detectLocale(): SupportedLocale {
  const savedLocale = localStorage.getItem('locale')

  if (isSupportedLocale(savedLocale)) {
    return savedLocale
  }

  const browserLocale = navigator.language.split('-')[0]

  if (isSupportedLocale(browserLocale)) {
    return browserLocale
  }

  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    de,
    en,
    es,
    fr,
    it,
    tr,
  },
})

export function applyLocale(locale: string | null | undefined): void {
  if (!isSupportedLocale(locale)) {
    return
  }

  localStorage.setItem('locale', locale)
  i18n.global.locale.value = locale
}