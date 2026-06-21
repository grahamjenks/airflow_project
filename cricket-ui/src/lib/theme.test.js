import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import {
  getThemePreference,
  resolveTheme,
  setThemePreference,
  systemPrefersDark,
} from './theme'

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  mockMatchMedia(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getThemePreference', () => {
  it('defaults to "system" when nothing is stored', () => {
    expect(getThemePreference()).toBe('system')
  })

  it('returns a stored valid preference', () => {
    localStorage.setItem('cricket_theme', 'dark')
    expect(getThemePreference()).toBe('dark')
  })

  it('falls back to "system" for an invalid stored value', () => {
    localStorage.setItem('cricket_theme', 'banana')
    expect(getThemePreference()).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('resolves explicit light/dark directly', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('resolves "system" using the OS preference', () => {
    mockMatchMedia(true)
    expect(resolveTheme('system')).toBe('dark')
    mockMatchMedia(false)
    expect(resolveTheme('system')).toBe('light')
  })
})

describe('systemPrefersDark', () => {
  it('reflects the media query result', () => {
    mockMatchMedia(true)
    expect(systemPrefersDark()).toBe(true)
  })
})

describe('setThemePreference', () => {
  it('persists the preference and applies the resolved theme to <html>', () => {
    setThemePreference('dark')
    expect(localStorage.getItem('cricket_theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applies the OS theme when set to "system"', () => {
    mockMatchMedia(true)
    setThemePreference('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
