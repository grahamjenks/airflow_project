import { formatCurrency } from '../lib/format'
import { effectiveAccessAge, findPerson, potOwner } from '../lib/projection'
import type { Assumptions, YearRow } from '../lib/types'

interface TooltipEntry {
  dataKey?: string | number
  name?: string
  value?: number
  color?: string
}

interface WealthTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  assumptions: Assumptions
  rows: YearRow[]
}

/**
 * Shows every pot and pension at the hovered year, its share of the total, and
 * whether it's still locked — so a stacked band can be read as a number.
 */
export function WealthTooltip({
  active,
  payload,
  label,
  assumptions: a,
  rows,
}: WealthTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const year = Number(label)
  const row = rows.find((r) => r.year === year)
  const total = payload.reduce((sum, p) => sum + (p.value ?? 0), 0)

  function lockedUntil(dataKey: string | number | undefined): number | null {
    const key = String(dataKey ?? '')
    if (!row) return null

    const pensionMatch = key.match(/^pension_(.+)$/)
    if (pensionMatch) {
      const person = findPerson(a, pensionMatch[1])
      if (!person || person.pensionType !== 'dc') return null
      const age = person.currentAge + row.t
      return age < person.pensionAccessAge ? person.pensionAccessAge : null
    }

    const potMatch = key.match(/^pot_(\d+)$/)
    if (potMatch) {
      const pot = a.pots[Number(potMatch[1])]
      if (!pot) return null
      const owner = potOwner(a, pot)
      const access = effectiveAccessAge(pot, owner.retirementAge)
      return owner.currentAge + row.t < access ? access : null
    }
    return null
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-800/95">
      <p className="mb-0.5 font-semibold text-slate-800 dark:text-slate-100">{year}</p>
      {row && (
        <p className="mb-2 text-[11px] text-slate-400">
          {row.people.map((p) => `${p.name} ${p.age}`).join(' · ')}
        </p>
      )}
      <table className="w-full">
        <tbody>
          {payload.map((entry) => {
            const value = entry.value ?? 0
            const locked = lockedUntil(entry.dataKey)
            const share = total > 0 ? Math.round((value / total) * 100) : 0
            return (
              <tr key={String(entry.dataKey)}>
                <td className="py-0.5 pr-3">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
                    {locked && (
                      <span
                        className="text-amber-600 dark:text-amber-400"
                        title={`Locked until age ${locked}`}
                      >
                        🔒{locked}
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-0.5 pr-2 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">
                  {formatCurrency(value)}
                </td>
                <td className="py-0.5 text-right tabular-nums text-slate-400">{share}%</td>
              </tr>
            )
          })}
          <tr className="border-t border-slate-200 dark:border-slate-600">
            <td className="pt-1.5 pr-3 font-semibold text-slate-700 dark:text-slate-200">Total</td>
            <td className="pt-1.5 pr-2 text-right font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {formatCurrency(total)}
            </td>
            <td />
          </tr>
          {row && row.dbIncomeTotal > 0 && (
            <tr>
              <td className="pt-1.5 pr-3 text-[11px] text-violet-600 dark:text-violet-400" colSpan={3}>
                + {formatCurrency(row.dbIncomeTotal)}/yr guaranteed pension income (no pot)
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
