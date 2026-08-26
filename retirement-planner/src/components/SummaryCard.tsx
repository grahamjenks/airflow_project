import type { ReactNode } from 'react'

type Tone = 'default' | 'good' | 'bad' | 'warn'

const toneClasses: Record<Tone, string> = {
  default: 'text-slate-900 dark:text-slate-100',
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-rose-600 dark:text-rose-400',
  warn: 'text-amber-600 dark:text-amber-400',
}

interface SummaryCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
}

export function SummaryCard({ label, value, sub, tone = 'default' }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}
