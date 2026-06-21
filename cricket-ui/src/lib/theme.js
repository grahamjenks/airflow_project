// Theme preference: 'system' | 'light' | 'dark'.
// The resolved theme ('light'/'dark') is written to <html data-theme> so the
// token overrides in index.css apply. An inline script in index.html sets the
// initial value before paint; this module keeps it in sync at runtime.

const STORAGE_KEY = 'cricket_theme'
const THEMES = ['system', 'light', 'dark']

export function getThemePreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return THEMES.includes(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

export function systemPrefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(pref = getThemePreference()) {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark()) ? 'dark' : 'light'
}

export function applyTheme(pref = getThemePreference()) {
  document.documentElement.setAttribute('data-theme', resolveTheme(pref))
}

export function setThemePreference(pref) {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    /* ignore persistence errors */
  }
  applyTheme(pref)
}

// Re-apply when the OS theme changes and the user is on 'system'.
export function watchSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    if (getThemePreference() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
