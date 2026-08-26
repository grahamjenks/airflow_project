import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'
import { effectiveAccessAge, potOwner } from '../lib/projection'
import { eventNoteFor, milestoneYears, selectRows } from '../lib/tableRows'
import type { Assumptions, YearRow } from '../lib/types'
import {
  DB_PENSION_COLOR,
  PENSION_COLORS,
  POT_COLORS,
  SALARY_COLOR,
  STATE_PENSION_COLOR,
} from './chartColors'
import { SegmentedToggle } from './SegmentedToggle'

interface IncomeTableProps {
  assumptions: Assumptions
  rows: YearRow[]
  title: string
  badge?: ReactNode
}

/**
 * Where each year's money comes from: salaries while working, then drawdown
 * broken out per pot alongside guaranteed pensions — set against outgoings.
 */
export function IncomeTable({ assumptions: a, rows, title, badge }: IncomeTableProps) {
  const [everyYear, setEveryYear] = useState(false)
  const [showDestinations, setShowDestinations] = useState(false)
  const [compact, setCompact] = useState(true)
  const [detailed, setDetailed] = useState(false)
  const fmt = compact ? formatCurrencyCompact : formatCurrency

  const dcPeople = useMemo(() => a.people.filter((p) => p.pensionType === 'dc'), [a.people])
  const milestones = useMemo(() => milestoneYears(a, rows), [a, rows])
  const shown = useMemo(() => selectRows(rows, everyYear, milestones), [rows, everyYear, milestones])

  const potAccess = useMemo(
    () =>
      a.pots.map((pot) => {
        const owner = potOwner(a, pot)
        return { access: effectiveAccessAge(pot, owner.retirementAge), owner }
      }),
    [a],
  )

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {badge}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
            {([false, true] as const).map((d) => (
              <button
                key={String(d)}
                type="button"
                onClick={() => setDetailed(d)}
                className={`px-2.5 py-1 text-xs font-medium ${
                  detailed === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {d ? 'Every source' : 'Summary'}
              </button>
            ))}
          </div>
          <SegmentedToggle
            ariaLabel="Figure precision"
            value={compact}
            onChange={setCompact}
            options={[
              [true, '£12k', 'Rounded figures'],
              [false, '£12,030', 'Exact figures'],
            ]}
          />
          <SegmentedToggle
            ariaLabel="Which years to show"
            value={everyYear}
            onChange={setEveryYear}
            options={[
              [false, 'Key years', 'Milestones and every fifth year'],
              [true, 'Every year', 'One row per year'],
            ]}
          />
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Take-home pay plus pensions each year, against what's going out. Switch to{' '}
        <strong>Every source</strong> to split it by person and pot. Pension contributions are
        already deducted from take-home, so only savings come out of "Left over". Click{' '}
        <strong>Into savings</strong> to see where it goes.
      </p>

      <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                Year
              </th>
              {!detailed && (
                <>
                  <Th color={SALARY_COLOR} label="Take-home" />
                  <Th color={DB_PENSION_COLOR} label="Pensions (guaranteed)" />
                  <Th color={POT_COLORS[0]} label="Drawdown" groupStart />
                </>
              )}
              {detailed &&
                a.people.map((p, pi) => (
                <Fragment key={`head-${p.id}`}>
                  <Th color={SALARY_COLOR} label={`${p.name}: take-home`} groupStart={pi > 0} />
                  {p.pensionType === 'db' ? (
                    p.dbSchemes.map((scheme) => (
                      <Th
                        key={`${p.id}-${scheme.id}`}
                        color={DB_PENSION_COLOR}
                        label={`${p.name}: ${scheme.name}`}
                      />
                    ))
                  ) : (
                    <Th
                      color={PENSION_COLORS[dcPeople.indexOf(p) % PENSION_COLORS.length]}
                      label={`${p.name}: pension`}
                    />
                  )}
                  <Th color={STATE_PENSION_COLOR} label={`${p.name}: state pension`} />
                </Fragment>
              ))}
              {detailed &&
                a.pots.map((pot, i) => (
                  <Th
                    key={pot.id}
                    color={POT_COLORS[i % POT_COLORS.length]}
                    label={pot.name}
                    groupStart={i === 0}
                  />
                ))}
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Gross income</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Tax</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">After tax</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Outgoings</th>
              <th className="border-l border-slate-200 px-2 py-2 text-right font-semibold whitespace-nowrap dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setShowDestinations((v) => !v)}
                  aria-expanded={showDestinations}
                  className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Into savings
                  <span className="text-slate-400">{showDestinations ? '▾' : '▸'}</span>
                </button>
              </th>
              {showDestinations && (
                <>
                  {dcPeople.map((p, i) => (
                    <Th
                      key={`into-${p.id}`}
                      color={PENSION_COLORS[i % PENSION_COLORS.length]}
                      label={`→ ${p.name}: pension`}
                    />
                  ))}
                  {a.pots.map((pot, i) => (
                    <Th
                      key={`into-${pot.id}`}
                      color={POT_COLORS[i % POT_COLORS.length]}
                      label={`→ ${pot.name}`}
                    />
                  ))}
                </>
              )}
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Left over</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Event</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const pensionContributions = row.people.reduce(
                (s, p) => s + p.pensionContribution,
                0,
              )
              const potContributions = row.potContributions.reduce((s, c) => s + c, 0)
              const contributions = pensionContributions + potContributions
              const totalIncome = row.guaranteedIncome + row.withdrawal
              // Pension contributions come out before take-home, so only pot
              // contributions are a further call on spendable income.
              const leftOver = row.netIncome - row.outgoings - potContributions
              const highlight = a.people.some((p) => p.currentAge + row.t === p.retirementAge)
              const rowBg = highlight ? 'bg-blue-50 dark:bg-blue-950/40' : ''
              const note = eventNoteFor(a, row)

              return (
                <tr key={row.t} className={`border-t border-slate-100 dark:border-slate-700 ${rowBg}`}>
                  <td
                    className={`sticky left-0 z-10 px-3 py-1.5 font-medium tabular-nums ${
                      highlight ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-800'
                    }`}
                  >
                    {row.year}
                  </td>
                  {!detailed && (
                    <>
                      <Money fmt={fmt} value={row.salaryTotal} />
                      <Money fmt={fmt} value={row.dbIncomeTotal + row.statePensionTotal} />
                      <Money fmt={fmt} value={row.withdrawal} groupStart />
                    </>
                  )}
                  {detailed &&
                    a.people.map((p, pi) => {
                    const py = row.people.find((x) => x.id === p.id)
                    return (
                      <Fragment key={`cell-${p.id}`}>
                        <Money fmt={fmt} value={py?.takeHome ?? 0} groupStart={pi > 0} />
                        {p.pensionType === 'db' ? (
                          p.dbSchemes.map((scheme) => {
                            const sy = py?.dbSchemes.find((x) => x.id === scheme.id)
                            return (
                              <Money fmt={fmt} key={`${p.id}-${scheme.id}`} value={sy?.income ?? 0} />
                            )
                          })
                        ) : (
                          <Money
                            fmt={fmt}
                            value={py?.pensionWithdrawal ?? 0}
                            locked={row.householdRetired && (py?.age ?? 0) < p.pensionAccessAge}
                          />
                        )}
                        <Money fmt={fmt} value={py?.statePension ?? 0} />
                      </Fragment>
                    )
                  })}
                  {detailed &&
                    a.pots.map((pot, i) => {
                      const { access, owner } = potAccess[i]
                      return (
                        <Money
                          fmt={fmt}
                          key={pot.id}
                          value={row.potWithdrawals[i] ?? 0}
                          locked={row.householdRetired && owner.currentAge + row.t < access}
                          groupStart={i === 0}
                        />
                      )
                    })}
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {fmt(totalIncome)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums ${
                      row.taxPaid > 0.5
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {row.taxPaid > 0.5 ? `−${fmt(row.taxPaid)}` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {fmt(row.netIncome)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {fmt(row.outgoings)}
                  </td>
                  <Money fmt={fmt} value={contributions} groupStart />
                  {showDestinations && (
                    <>
                      {dcPeople.map((p) => {
                        const py = row.people.find((x) => x.id === p.id)
                        return <Money fmt={fmt} key={`into-${p.id}`} value={py?.pensionContribution ?? 0} />
                      })}
                      {a.pots.map((pot, i) => (
                        <Money fmt={fmt} key={`into-${pot.id}`} value={row.potContributions[i] ?? 0} />
                      ))}
                    </>
                  )}
                  <td
                    className={`px-3 py-1.5 text-right font-medium tabular-nums ${
                      leftOver < -0.5
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {fmt(leftOver)}
                  </td>
                  <td className="px-3 py-1.5 text-left whitespace-nowrap text-slate-400">
                    {row.shortfall > 0.01 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        Short {fmt(row.shortfall)}
                      </span>
                    ) : (
                      note
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({
  color,
  label,
  groupStart = false,
}: {
  color: string
  label: string
  groupStart?: boolean
}) {
  return (
    <th
      className={`px-2 py-2 text-right font-semibold whitespace-nowrap ${
        groupStart ? 'border-l border-slate-200 dark:border-slate-600' : ''
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
    </th>
  )
}

function Money({
  value,
  fmt,
  locked = false,
  groupStart = false,
}: {
  value: number
  fmt: (n: number) => string
  locked?: boolean
  groupStart?: boolean
}) {
  const edge = groupStart ? 'border-l border-slate-200 dark:border-slate-600' : ''
  if (locked) {
    return (
      <td
        className={`px-2 py-1.5 text-right tabular-nums text-slate-300 dark:text-slate-600 ${edge}`}
        title="Locked — cannot be drawn on this year"
      >
        🔒
      </td>
    )
  }
  return (
    <td
      className={`px-2 py-1.5 text-right tabular-nums ${edge} ${
        value <= 0.5 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'
      }`}
    >
      {value > 0.5 ? fmt(value) : '—'}
    </td>
  )
}
