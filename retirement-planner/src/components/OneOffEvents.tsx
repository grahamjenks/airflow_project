import { formatCurrency } from '../lib/format'
import { newId } from '../lib/storage'
import type { OneOffEvent, SavingsPot } from '../lib/types'
import { NumberField } from './NumberField'

interface OneOffEventsProps {
  events: OneOffEvent[]
  pots: SavingsPot[]
  primaryName: string
  currentAge: number
  retirementAge: number
  onChange: (events: OneOffEvent[]) => void
}

export function OneOffEvents({
  events,
  pots,
  primaryName,
  currentAge,
  retirementAge,
  onChange,
}: OneOffEventsProps) {
  const sorted = [...events].sort((a, b) => a.atAge - b.atAge)

  function update(id: string, patch: Partial<OneOffEvent>) {
    onChange(events.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function remove(id: string) {
    onChange(events.filter((e) => e.id !== id))
  }

  function add() {
    const last = sorted[sorted.length - 1]
    const nextAge = last ? last.atAge + 5 : retirementAge
    onChange([
      ...events,
      { id: newId(), name: 'Inheritance', atAge: nextAge, amount: 50000, potId: pots[0].id },
    ])
  }

  if (pots.length === 0) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Add a savings pot first — a lump sum needs somewhere to land.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((event) => {
        const incoming = event.amount >= 0
        const inThePast = event.atAge < currentAge
        return (
          <div
            key={event.id}
            className="rounded-lg border border-slate-200 p-2 dark:border-slate-600"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    What is it
                  </span>
                  <input
                    type="text"
                    value={event.name}
                    onChange={(e) => update(event.id, { name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </label>

                <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                  {([true, false] as const).map((isIn) => (
                    <button
                      key={String(isIn)}
                      type="button"
                      onClick={() =>
                        update(event.id, {
                          amount: Math.abs(event.amount) * (isIn ? 1 : -1),
                          // Carry the default name across with the direction,
                          // but never overwrite one they have written.
                          ...(event.name === (isIn ? 'Gift' : 'Inheritance')
                            ? { name: isIn ? 'Inheritance' : 'Gift' }
                            : {}),
                        })
                      }
                      className={`flex-1 px-2 py-1 text-xs font-medium ${
                        incoming === isIn
                          ? isIn
                            ? 'bg-violet-600 text-white'
                            : 'bg-rose-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isIn ? 'Money in' : 'Money out'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label={`At ${primaryName}'s age`}
                    value={event.atAge}
                    onChange={(v) => update(event.id, { atAge: v })}
                    min={0}
                    max={120}
                  />
                  <NumberField
                    label="Amount"
                    value={Math.abs(event.amount)}
                    onChange={(v) => update(event.id, { amount: Math.abs(v) * (incoming ? 1 : -1) })}
                    prefix="£"
                    step={1000}
                  />
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {incoming ? 'Goes into' : 'Comes out of'}
                  </span>
                  <select
                    value={event.potId}
                    onChange={(e) => update(event.id, { potId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    {pots.map((pot) => (
                      <option key={pot.id} value={pot.id}>
                        {pot.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={() => remove(event.id)}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                aria-label={`Remove ${event.name}`}
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

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {incoming ? 'Adds ' : 'Takes '}
              <strong>{formatCurrency(Math.abs(event.amount))}</strong>
              {incoming ? ' to ' : ' from '}
              the pot in one year, in today's money.
            </p>
            {inThePast && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Before {primaryName}'s current age of {currentAge}, so it never happens.
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
        + Add a one-off
      </button>
    </div>
  )
}
