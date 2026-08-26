import { resolveDrawdownOrder } from '../lib/projection'
import { personIdFromSource } from '../lib/types'
import type { Assumptions, DrawdownStrategy } from '../lib/types'
import { PENSION_COLORS, POT_COLORS } from './chartColors'

interface DrawdownOrderProps {
  assumptions: Assumptions
  onStrategyChange: (strategy: DrawdownStrategy) => void
  onOrderChange: (order: string[]) => void
}

export function DrawdownOrder({
  assumptions: a,
  onStrategyChange,
  onOrderChange,
}: DrawdownOrderProps) {
  const resolved = resolveDrawdownOrder(a, a.drawdownOrder)
  const strategy = a.drawdownStrategy
  const dcPeople = a.people.filter((p) => p.pensionType === 'dc')

  function labelFor(id: string): { name: string; color: string } {
    const personId = personIdFromSource(id)
    if (personId) {
      const idx = dcPeople.findIndex((p) => p.id === personId)
      const person = dcPeople[idx]
      return {
        name: person ? `${person.name}: pension` : 'Pension',
        color: PENSION_COLORS[Math.max(0, idx) % PENSION_COLORS.length],
      }
    }
    const idx = a.pots.findIndex((p) => p.id === id)
    return {
      name: a.pots[idx]?.name ?? 'Unknown pot',
      color: POT_COLORS[Math.max(0, idx) % POT_COLORS.length],
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= resolved.length) return
    const next = [...resolved]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onOrderChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <StrategyOption
          label="Spread across all pots"
          description="Each year's shortfall is taken from every unlocked pot in proportion, so they shrink together."
          checked={strategy === 'proportional'}
          onSelect={() => onStrategyChange('proportional')}
        />
        <StrategyOption
          label="Use pots in a set order"
          description="Empty the first pot before touching the next. Useful for spending taxable money first."
          checked={strategy === 'priority'}
          onSelect={() => onStrategyChange('priority')}
        />
      </div>

      <div className="space-y-1.5">
        {strategy === 'priority' ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drawn from top to bottom. A pot that's still locked is skipped until it unlocks.
            Salary-based pensions never appear here — they pay an income, not a pot.
          </p>
        ) : (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            This order is <strong>not being used</strong> — every unlocked pot is drawn on at once.
            Choose "Use pots in a set order" above to apply it.
          </p>
        )}
        <div className={strategy === 'priority' ? '' : 'pointer-events-none opacity-40'}>
          {resolved.map((id, i) => {
            const { name, color } = labelFor(id)
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 dark:border-slate-600"
              >
                <span className="w-4 shrink-0 text-xs font-semibold text-slate-400 tabular-nums">
                  {i + 1}
                </span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                  {name}
                </span>
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0 || strategy !== 'priority'}
                  className="shrink-0 rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label={`Move ${name} earlier`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === resolved.length - 1 || strategy !== 'priority'}
                  className="shrink-0 rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label={`Move ${name} later`}
                >
                  ↓
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface StrategyOptionProps {
  label: string
  description: string
  checked: boolean
  onSelect: () => void
}

function StrategyOption({ label, description, checked, onSelect }: StrategyOptionProps) {
  return (
    <label
      className={`flex cursor-pointer gap-2 rounded-lg border p-2 ${
        checked
          ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600'
      }`}
    >
      <input
        type="radio"
        name="drawdown-strategy"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </label>
  )
}
