import { useEffect, useState } from 'react'
import { getThemePreference, setThemePreference, watchSystemTheme } from '../lib/theme'
import './ThemeToggle.css'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'system', label: 'System', icon: '🖥️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
]

export default function ThemeToggle() {
  const [pref, setPref] = useState(getThemePreference)

  useEffect(() => watchSystemTheme(), [])

  const choose = (value) => {
    setPref(value)
    setThemePreference(value)
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={pref === o.value}
          className={`theme-toggle__btn${pref === o.value ? ' theme-toggle__btn--active' : ''}`}
          onClick={() => choose(o.value)}
          title={`${o.label} theme`}
        >
          <span aria-hidden="true">{o.icon}</span>
          <span className="theme-toggle__label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
