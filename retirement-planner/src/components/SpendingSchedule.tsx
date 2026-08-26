import { formatCurrency } from '../lib/format'
import { newId } from '../lib/storage'
import type { SpendingBand } from '../lib/types'
import { NumberField } from './NumberField'

interface SpendingScheduleProps {
  baseAmount: number
  retirementAge: number
  lifeExpectancy: number
  changes: SpendingBand[]
  onChange: (changes: SpendingBand[]) => void
}

export function SpendingSchedule({
  baseAmount,
  retirementAge,
  lifeExpectancy,
  changes,
  onChange,
}: SpendingScheduleProps) {
  const sorted = [...changes].sort((a, b) => a.fromAge - b.fromAge)

  function update(id: string, patch: Partial<SpendingBand>) {
    onChange(changes.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function remove(id: string) {
    onChange(changes.filter((c) => c.id !== id))
  }

  function add() {
    const last = sorted[sorted.length - 1]
    const nextAge = Math.min(lifeExpectancy, (last ? last.fromAge : retirementAge) + 5)
    onChange([
      ...changes,
      { id: newId(), fromAge: nextAge, amount: last ? last.amount : baseAmount },
    ])
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        From age <strong>{retirementAge}</strong>: <strong>{formatCurrency(baseAmount)}</strong> a
        year
      </div>

      {sorted.map((band) => {
        const beforeRetirement = band.fromAge < retirementAge
        return (
          <div
            key={band.id}
            className="rounded-lg border border-slate-200 p-2 dark:border-slate-600"
          >
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-2 gap-2">
                <NumberField
                  label="From age"
                  value={band.fromAge}
                  onChange={(v) => update(band.id, { fromAge: v })}
                  min={0}
                  max={120}
                />
                <NumberField
                  label="Spend"
                  value={band.amount}
                  onChange={(v) => update(band.id, { amount: v })}
                  prefix="£"
                  step={1000}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(band.id)}
                className="mt-6 shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                aria-label={`Remove spending change at age ${band.fromAge}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {beforeRetirement && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Before your retirement age of {retirementAge}, so it has no effect yet.
              </p>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
      >
        + Add a spending change
      </button>
    </div>
  )
}
