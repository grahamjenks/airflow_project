import { useState, type ReactNode } from 'react'

interface InputSectionProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function InputSection({ title, icon, defaultOpen = true, children }: InputSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {icon}
          {title}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-4 px-4 pb-5">{children}</div>}
    </div>
  )
}
