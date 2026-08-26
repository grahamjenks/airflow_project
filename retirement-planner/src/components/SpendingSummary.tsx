import { useState } from 'react'
import { formatCurrency } from '../lib/format'
import type { Assumptions, YearRow } from '../lib/types'

interface SpendingSummaryProps {
  assumptions: Assumptions
  rows: YearRow[]
}

interface PersonSpan {
  id: string
  name: string
  fromAge: number
  toAge: number
  retired: boolean
}

interface Phase {
  fromYear: number
  toYear: number
  people: PersonSpan[]
  spending: number
  mortgage: number
}

/**
 * Groups consecutive years that share the same outgoings *and* the same
 * working/retired state for everyone. A phase therefore breaks when the first
 * person retires, even though household spending doesn't change until the last
 * one does — otherwise that transition would be invisible.
 */
function phasesFrom(rows: YearRow[]): Phase[] {
  const phases: Phase[] = []
  for (const r of rows) {
    const spending = r.outgoings - r.mortgagePayment
    const stateKey = r.people.map((p) => (p.retired ? '1' : '0')).join('')
    const last = phases[phases.length - 1]
    const lastKey = last?.people.map((p) => (p.retired ? '1' : '0')).join('')

    if (
      last &&
      lastKey === stateKey &&
      Math.abs(last.spending - spending) < 0.5 &&
      Math.abs(last.mortgage - r.mortgagePayment) < 0.5
    ) {
      last.toYear = r.year
      last.people.forEach((ps) => {
        const py = r.people.find((x) => x.id === ps.id)
        if (py) ps.toAge = py.age
      })
    } else {
      phases.push({
        fromYear: r.year,
        toYear: r.year,
        spending,
        mortgage: r.mortgagePayment,
        people: r.people.map((p) => ({
          id: p.id,
          name: p.name,
          fromAge: p.age,
          toAge: p.age,
          retired: p.retired,
        })),
      })
    }
  }
  return phases
}

export function SpendingSummary({ assumptions: a, rows }: SpendingSummaryProps) {
  const phases = phasesFrom(rows)
  const [monthly, setMonthly] = useState(false)
  // Costs are held annually; monthly is a presentation choice.
  const money = (annual: number) => formatCurrency(monthly ? annual / 12 : annual)
  const per = monthly ? 'a month' : 'a year'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Spending assumptions</h2>
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
          {([false, true] as const).map((m) => (
            <button
              key={String(m)}
              type="button"
              onClick={() => setMonthly(m)}
              className={`px-2.5 py-1 text-xs font-medium ${
                monthly === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {m ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Every outgoing the plan assumes, and when it applies. Living costs are shared across the
        household and switch to your retirement figure once everyone has stopped work. All figures
        are in today's money and rise with inflation.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {a.people.map((p) => (
                <th
                  key={p.id}
                  className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                >
                  {p.name}
                </th>
              ))}
              <th className="border-l border-slate-200 px-3 py-2 text-left font-semibold whitespace-nowrap dark:border-slate-600">
                Years
              </th>
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Living costs</th>
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Mortgage</th>
              <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Total {per}</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => (
              <tr
                key={`${phase.fromYear}-${phase.spending}-${phase.mortgage}`}
                className="border-t border-slate-100 dark:border-slate-700"
              >
                {phase.people.map((ps) => (
                  <td key={ps.id} className="px-3 py-1.5 whitespace-nowrap">
                    <span className="tabular-nums">
                      {ps.fromAge === ps.toAge ? ps.fromAge : `${ps.fromAge}–${ps.toAge}`}
                    </span>{' '}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        ps.retired
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {ps.retired ? 'retired' : 'working'}
                    </span>
                  </td>
                ))}
                <td className="border-l border-slate-200 px-3 py-1.5 tabular-nums whitespace-nowrap text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  {phase.fromYear === phase.toYear
                    ? phase.fromYear
                    : `${phase.fromYear}–${phase.toYear}`}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {money(phase.spending)}
                </td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums ${
                    phase.mortgage > 0 ? '' : 'text-slate-300 dark:text-slate-600'
                  }`}
                >
                  {phase.mortgage > 0 ? money(phase.mortgage) : '—'}
                </td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {money(phase.spending + phase.mortgage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
