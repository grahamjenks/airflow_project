import { formatCurrency } from '../lib/format'
import { allowanceFor } from '../lib/tax'
import type { Assumptions, YearRow } from '../lib/types'
import {
  ALERT_COLOR,
  DB_PENSION_COLOR,
  PENSION_COLORS,
  POT_COLORS,
  SALARY_COLOR,
  STATE_PENSION_COLOR,
} from './chartColors'

interface IncomeTooltipProps {
  active?: boolean
  label?: string | number
  assumptions: Assumptions
  rows: YearRow[]
}

interface Line {
  key: string
  name: string
  color: string
  value: number
}

/**
 * Groups a year into income sources, then outgoings and what's left, rather
 * than listing every chart series flat. Zero rows are dropped so a year with
 * two income sources shows two lines, not nine.
 */
export function IncomeTooltip({ active, label, assumptions: a, rows }: IncomeTooltipProps) {
  if (!active) return null
  const year = Number(label)
  const row = rows.find((r) => r.year === year)
  if (!row) return null

  const dcPeople = a.people.filter((p) => p.pensionType === 'dc')
  const lines: Line[] = []

  row.people.forEach((py) => {
    if (py.takeHome > 0.5) {
      lines.push({
        key: `s-${py.id}`,
        name: `${py.name}: take-home`,
        color: SALARY_COLOR,
        value: py.takeHome,
      })
    }
  })
  row.people.forEach((py) => {
    py.dbSchemes.forEach((sch) => {
      if (sch.income > 0.5) {
        lines.push({
          key: `db-${py.id}-${sch.id}`,
          name: `${py.name}: ${sch.name}`,
          color: DB_PENSION_COLOR,
          value: sch.income,
        })
      }
    })
  })
  row.people.forEach((py) => {
    if (py.statePension > 0.5) {
      lines.push({
        key: `sp-${py.id}`,
        name: `${py.name}: state pension`,
        color: STATE_PENSION_COLOR,
        value: py.statePension,
      })
    }
  })
  dcPeople.forEach((person, i) => {
    const py = row.people.find((x) => x.id === person.id)
    if (py && py.pensionWithdrawal > 0.5) {
      lines.push({
        key: `dw-${person.id}`,
        name: `From ${person.name}: pension`,
        color: PENSION_COLORS[i % PENSION_COLORS.length],
        value: py.pensionWithdrawal,
      })
    }
  })
  a.pots.forEach((pot, i) => {
    const v = row.potWithdrawals[i] ?? 0
    if (v > 0.5) {
      lines.push({
        key: `pw-${pot.id}`,
        name: `From ${pot.name}`,
        color: POT_COLORS[i % POT_COLORS.length],
        value: v,
      })
    }
  })

  const totalIncome = row.guaranteedIncome + row.withdrawal
  const leftOver = row.netIncome - row.outgoings

  return (
    <div className="max-w-xs rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-800/95">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{year}</p>
      <p className="mb-2 text-[11px] text-slate-400">
        {row.people.map((p) => `${p.name} ${p.age}`).join(' · ')}
      </p>

      <table className="w-full">
        <tbody>
          {lines.map((l) => (
            <tr key={l.key}>
              <td className="py-0.5 pr-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="text-slate-600 dark:text-slate-300">{l.name}</span>
                </span>
              </td>
              <td className="py-0.5 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">
                {formatCurrency(l.value)}
              </td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td className="py-0.5 text-slate-400" colSpan={2}>
                No income this year
              </td>
            </tr>
          )}

          <tr className="border-t border-slate-200 dark:border-slate-600">
            <td className="pt-1.5 pr-3 text-slate-600 dark:text-slate-300">Gross income</td>
            <td className="pt-1.5 text-right tabular-nums text-slate-800 dark:text-slate-100">
              {formatCurrency(totalIncome)}
            </td>
          </tr>
          {row.taxPaid > 0.5 && (
            <tr>
              <td className="pr-3 text-amber-700 dark:text-amber-400">Income tax</td>
              <td className="text-right tabular-nums text-amber-700 dark:text-amber-400">
                −{formatCurrency(row.taxPaid)}
              </td>
            </tr>
          )}
          {row.taxPaid > 0.5 &&
            row.people
              .filter((py) => py.taxPaid > 0.5)
              .map((py) => {
                // Taxable income drives the band; the tax-free share of a
                // drawdown never counts towards it.
                const taxable = py.statePension + py.dbIncome + py.taxablePensionWithdrawal
                const pa = allowanceFor(taxable, a.tax)
                const higherStart = pa + a.tax.basicBandWidth
                const headroom = higherStart - taxable
                return (
                  <tr key={`tax-${py.id}`}>
                    <td className="pr-3 pl-3 text-[11px] text-slate-400" colSpan={2}>
                      {py.name}: {formatCurrency(taxable)} taxable → {formatCurrency(py.taxPaid)}
                      {headroom > 0 ? (
                        <> · {formatCurrency(headroom)} below {a.tax.higherRatePct}% band</>
                      ) : (
                        <> · in the {a.tax.higherRatePct}% band</>
                      )}
                    </td>
                  </tr>
                )
              })}
          <tr>
            <td className="pr-3 font-semibold text-slate-700 dark:text-slate-200">After tax</td>
            <td className="text-right font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {formatCurrency(row.netIncome)}
            </td>
          </tr>
          <tr>
            <td className="pr-3 text-slate-600 dark:text-slate-300">Outgoings</td>
            <td className="text-right tabular-nums text-slate-800 dark:text-slate-100">
              −{formatCurrency(row.outgoings)}
            </td>
          </tr>
          <tr>
            <td className="pr-3 font-semibold text-slate-700 dark:text-slate-200">
              {leftOver < -0.5 ? 'Short by' : 'Left over'}
            </td>
            <td
              className="text-right font-bold tabular-nums"
              style={{ color: leftOver < -0.5 ? ALERT_COLOR : undefined }}
            >
              {formatCurrency(Math.abs(leftOver))}
            </td>
          </tr>

          {row.shortfall > 0.5 && (
            <tr>
              <td
                className="pt-1.5 text-[11px]"
                colSpan={2}
                style={{ color: ALERT_COLOR }}
              >
                Couldn't be funded — {formatCurrency(row.shortfall)} unmet
                {row.blockedByLock ? ' (funds exist but are locked)' : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
