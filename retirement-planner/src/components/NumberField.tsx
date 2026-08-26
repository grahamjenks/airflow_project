import { useState } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  hint?: string
  disabled?: boolean
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  hint,
  disabled = false,
}: NumberFieldProps) {
  // While the field is being edited we show the raw text, so it can be cleared
  // rather than snapping back to "0" and forcing new digits to append to it.
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? (Number.isFinite(value) ? String(value) : '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // "05" -> "5", so typing into a zeroed field doesn't leave a leading zero.
    const next = e.target.value.replace(/^(-?)0+(?=\d)/, '$1')
    setDraft(next)

    if (next === '' || next === '-') {
      onChange(0)
      return
    }
    const parsed = Number(next)
    if (!Number.isNaN(parsed)) onChange(parsed)
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div
        className={`mt-1 flex items-center rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-600 ${
          disabled ? 'bg-slate-100 dark:bg-slate-900' : 'bg-white dark:bg-slate-800'
        }`}
      >
        {prefix && <span className="pl-3 text-sm text-slate-400 select-none">{prefix}</span>}
        <input
          type="number"
          className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-100 dark:disabled:text-slate-500"
          value={display}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          onBlur={() => setDraft(null)}
        />
        {suffix && <span className="pr-3 text-sm text-slate-400 select-none">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </label>
  )
}
