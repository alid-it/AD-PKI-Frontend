export type ColorKey =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'bg'
  | 'card'
  | 'navbar'
  | 'navbar_text'

export type ThemeColors = Record<ColorKey, string>