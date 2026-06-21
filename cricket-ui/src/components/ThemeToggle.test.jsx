import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import ThemeToggle from './ThemeToggle'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }))
})

describe('ThemeToggle', () => {
  it('renders the three theme options as radios', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('radio', { name: /light/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /system/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /dark/i })).toBeInTheDocument()
  })

  it('defaults to System when no preference is stored', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('radio', { name: /system/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('selecting Dark persists the preference and applies it to <html>', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('radio', { name: /dark/i }))
    expect(screen.getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem('cricket_theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
