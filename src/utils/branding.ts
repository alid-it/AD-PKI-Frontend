// =========================================
// BRANDING – Farben pro Theme (Light / Dark)
// -----------------------------------------
// Branding steuert nur die 8 "Marken"-/Strukturfarben (siehe ColorKey).
// Alle uebrigen Variablen (text, border, surface-2, ...) bleiben in theme.css
// und schalten ueber [data-theme] um.
//
// Persistenz:
//  - Backend:   setting "color_<key>_<mode>"      (z.B. color_bg_dark)
//  - localStorage["branding"] = { light: {...}, dark: {...} }   (Cache fuer
//    sofortiges Anwenden beim App-Start, ohne auf die API zu warten)
//
// Wichtig: localStorage["theme"] bleibt ausschliesslich der Modus
// ("light" | "dark") – frueher hat das alte BrandingView diesen Key mit einem
// JSON-Farbobjekt ueberschrieben und damit den Dark-Mode-Toggle zerstoert.
// =========================================

import type { ColorKey, ThemeColors } from '@/types/theme'

export type ThemeMode = 'light' | 'dark'
export type BrandingSets = Record<ThemeMode, ThemeColors>

export const colorKeys: ColorKey[] = [
  'primary',
  'secondary',
  'success',
  'danger',
  'bg',
  'card',
  'navbar',
  'navbar_text',
]

// Defaults spiegeln exakt theme.css (:root = light, [data-theme="dark"]).
export const defaultBranding: BrandingSets = {
  light: {
    primary: '#3b82f6',
    secondary: '#e5e7eb',
    success: '#22c55e',
    danger: '#ef4444',
    bg: '#f5f6f8',
    card: '#ffffff',
    navbar: '#ffffff',
    navbar_text: '#1e293b',
  },
  dark: {
    primary: '#60a5fa',
    secondary: '#334155',
    success: '#22c55e',
    danger: '#ef4444',
    bg: '#0f172a',
    card: '#1e293b',
    navbar: '#1e293b',
    navbar_text: '#f1f5f9',
  },
}

const BRANDING_KEY = 'branding'

// Aktiven Modus bestimmen: localStorage["theme"] -> System -> "light".
export const getActiveMode = (): ThemeMode => {
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Branding-Cache lesen (Defaults als Fallback, fehlende Keys auffuellen).
export const loadBrandingCache = (): BrandingSets => {
  const result: BrandingSets = {
    light: { ...defaultBranding.light },
    dark: { ...defaultBranding.dark },
  }

  const raw = localStorage.getItem(BRANDING_KEY)
  if (!raw) return result

  try {
    const parsed = JSON.parse(raw)
    for (const mode of ['light', 'dark'] as ThemeMode[]) {
      if (parsed?.[mode] && typeof parsed[mode] === 'object') {
        for (const key of colorKeys) {
          if (typeof parsed[mode][key] === 'string') {
            result[mode][key] = parsed[mode][key]
          }
        }
      }
    }
  } catch {
    localStorage.removeItem(BRANDING_KEY)
  }

  return result
}

export const saveBrandingCache = (sets: BrandingSets) => {
  localStorage.setItem(BRANDING_KEY, JSON.stringify(sets))
}

// Eine Farbpalette als Inline-CSS-Variablen auf <html> setzen.
export const applyColorsToDom = (colors: ThemeColors) => {
  for (const key of colorKeys) {
    document.documentElement.style.setProperty(
      `--color-${key.replace('_', '-')}`,
      colors[key]
    )
  }
}

// Branding fuer einen Modus anwenden (aus dem Cache).
export const applyBranding = (mode: ThemeMode = getActiveMode()) => {
  applyColorsToDom(loadBrandingCache()[mode])
}
