import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'
import { effectiveAccessAge, potOwner, realRate } from '../lib/projection'
import { eventNoteFor, milestoneYears, selectRows } from '../lib/tableRows'
import type { Assumptions, YearRow } from '../lib/types'
import { PENSION_COLORS, POT_COLORS } from './chartColors'

interface BalancesTableProps {
  assumptions: Assumptions
  rows: YearRow[]
  title: string
  badge?: ReactNode
}

export function BalancesTable({ assumptions: a, rows, title, badge }: BalancesTableProps) {
  const [everyYear, setEveryYear] = useState(false)
  const [view, setView] = useState<'balances' | 'drawdown' | 'breakdown'>('balances')
  const showingDrawdown = view === 'drawdown'
  const showingBreakdown = view === 'breakdown'
  const [compact, setCompact] = useState(true)
  const fmt = compact ? formatCurrencyCompact : formatCurrency

  const dcPeople = useMemo(() => a.people.filter((p) => p.pensionType === 'dc'), [a.people])
  const milestones = useMemo(() => milestoneYears(a, rows), [a, rows])
  const shown = useMemo(() => selectRows(rows, everyYear, milestones), [rows, everyYear, milestones])

  const accessAges = useMemo(
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
            {(['balances', 'drawdown', 'breakdown'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-2.5 py-1 text-xs font-medium ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {v === 'balances' ? 'Balances' : v === 'drawdown' ? 'Drawdown' : 'Breakdown'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCompact((v) => !v)}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            title={compact ? 'Show exact figures' : 'Show rounded figures'}
          >
            {compact ? '£12k' : '£12,030'}
          </button>
          <button
            type="button"
            onClick={() => setEveryYear((v) => !v)}
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {everyYear ? 'Key years' : 'Every year'}
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {showingBreakdown
            ? `Each savings pot year by year: start + interest + contributions − withdrawals = end. Interest is real growth after ${a.inflationRate}% inflation — ${a.pots.map((p) => `${p.name} ${p.growthRate}% → ${(realRate(p.growthRate, a.inflationRate) * 100).toFixed(2)}%`).join(', ')}.`
            : showingDrawdown
              ? "How much came out of each pot each year. A pot can only be drawn on once it's unlocked."
              : "Balance of every pot and pension at each year. Greyed values with 🔒 aren't accessible yet."}
      </p>

      {showingBreakdown ? (
        <BreakdownTable a={a} shown={shown} fmt={fmt} />
      ) : (
      <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                Year
              </th>
              {a.people.map((p) => (
                <th
                  key={p.id}
                  className="px-2 py-2 text-right font-semibold whitespace-nowrap text-slate-500 dark:text-slate-400"
                >
                  {p.name}
                </th>
              ))}
              {dcPeople.map((p, i) => (
                <th key={p.id} className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PENSION_COLORS[i % PENSION_COLORS.length] }}
                    />
                    {p.name}: pension
                  </span>
                </th>
              ))}
              {a.pots.map((pot, i) => (
                <th key={pot.id} className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: POT_COLORS[i % POT_COLORS.length] }}
                    />
                    {pot.name}
                  </span>
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                {showingDrawdown ? 'Total drawn' : 'Total'}
              </th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Event</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const note = eventNoteFor(a, row)
              const highlight = a.people.some((p) => p.currentAge + row.t === p.retirementAge)
              const rowBg = highlight ? 'bg-blue-50 dark:bg-blue-950/40' : ''
              return (
                <tr key={row.t} className={`border-t border-slate-100 dark:border-slate-700 ${rowBg}`}>
                  <td
                    className={`sticky left-0 z-10 px-3 py-1.5 font-medium tabular-nums ${
                      highlight ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-800'
                    }`}
                  >
                    {row.year}
                  </td>
                  {row.people.map((py) => (
                    <td
                      key={py.id}
                      className="px-2 py-1.5 text-right tabular-nums text-slate-400"
                    >
                      {py.age}
                    </td>
                  ))}
                  {dcPeople.map((person) => {
                    const py = row.people.find((x) => x.id === person.id)
                    const locked = (py?.age ?? 0) < person.pensionAccessAge
                    return (
                      <Cell
                       fmt={fmt}
                        key={person.id}
                        value={showingDrawdown ? (py?.pensionWithdrawal ?? 0) : (py?.pensionPot ?? 0)}
                        locked={locked}
                        drawdown={showingDrawdown}
                      />
                    )
                  })}
                  {a.pots.map((pot, i) => {
                    const { access, owner } = accessAges[i]
                    const locked = owner.currentAge + row.t < access
                    return (
                      <Cell
                       fmt={fmt}
                        key={pot.id}
                        value={
                          showingDrawdown
                            ? (row.potWithdrawals[i] ?? 0)
                            : (row.potBalances[i] ?? 0)
                        }
                        locked={locked}
                        drawdown={showingDrawdown}
                      />
                    )
                  })}
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {fmt(showingDrawdown ? row.withdrawal : row.totalPot)}
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
      )}
    </div>
  )
}

/** One column group per pot: Start, Interest, In, Out, End. */
function BreakdownTable({
  a,
  shown,
  fmt,
}: {
  a: Assumptions
  shown: YearRow[]
  fmt: (n: number) => string
}) {
  const cols = ['Start', 'Interest', 'In', 'Out', 'End']
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900">
            <th
              rowSpan={2}
              className="sticky top-0 left-0 z-30 bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Year
            </th>
            {a.pots.map((pot, i) => (
              <th
                key={pot.id}
                colSpan={5}
                className="sticky top-0 z-20 border-l border-slate-300 bg-slate-50 px-3 py-1.5 text-center font-semibold whitespace-nowrap dark:border-slate-500 dark:bg-slate-900"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: POT_COLORS[i % POT_COLORS.length] }}
                  />
                  {pot.name}
                </span>
              </th>
            ))}
          </tr>
          <tr className="bg-slate-50 dark:bg-slate-900">
            {a.pots.map((pot) =>
              cols.map((c, ci) => (
                <th
                  key={`${pot.id}-${c}`}
                  className={`sticky top-[30px] z-20 bg-slate-50 px-3 py-1.5 text-right font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400 ${
                    ci === 0 ? 'border-l border-slate-300 dark:border-slate-500' : ''
                  }`}
                >
                  {c}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => {
            const highlight = a.people.some((p) => p.currentAge + row.t === p.retirementAge)
            const rowBg = highlight ? 'bg-blue-50 dark:bg-blue-950/40' : ''
            return (
              <tr key={row.t} className={`border-t border-slate-100 dark:border-slate-700 ${rowBg}`}>
                <td
                  className={`sticky left-0 z-10 px-3 py-1.5 font-medium tabular-nums ${
                    highlight ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  {row.year}
                </td>
                {a.pots.map((pot, i) => {
                  const start = row.potStartBalances[i] ?? 0
                  const interest = row.potInterest[i] ?? 0
                  const paidIn = row.potContributions[i] ?? 0
                  const out = row.potWithdrawals[i] ?? 0
                  const end = row.potBalances[i] ?? 0
                  return (
                    <Fragment key={pot.id}>
                      <Num fmt={fmt} value={start} groupStart />
                      <Num fmt={fmt} value={interest} tone="grow" />
                      <Num fmt={fmt} value={paidIn} tone="in" />
                      <Num fmt={fmt} value={out} tone="out" />
                      <Num fmt={fmt} value={end} bold />
                    </Fragment>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Num({
  value,
  fmt,
  groupStart = false,
  bold = false,
  tone,
}: {
  value: number
  fmt: (n: number) => string
  groupStart?: boolean
  bold?: boolean
  tone?: 'grow' | 'in' | 'out'
}) {
  const zero = Math.abs(value) < 0.5
  const toneClass = zero
    ? 'text-slate-300 dark:text-slate-600'
    : tone === 'grow'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'in'
        ? 'text-blue-600 dark:text-blue-400'
        : tone === 'out'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-700 dark:text-slate-200'
  return (
    <td
      className={`px-2 py-1.5 text-right tabular-nums ${toneClass} ${bold ? 'font-semibold' : ''} ${
        groupStart ? 'border-l border-slate-300 dark:border-slate-500' : ''
      }`}
    >
      {zero ? '—' : `${tone === 'out' && value > 0 ? '-' : ''}${fmt(value)}`}
    </td>
  )
}

function Cell({
  value,
  fmt,
  locked,
  drawdown = false,
}: {
  value: number
  fmt: (n: number) => string
  locked: boolean
  drawdown?: boolean
}) {
  if (drawdown) {
    return (
      <td
        className={`px-2 py-1.5 text-right tabular-nums ${
          locked ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'
        }`}
        title={locked ? 'Locked — cannot be drawn on this year' : undefined}
      >
        {locked ? '🔒' : value > 0.5 ? fmt(value) : '—'}
      </td>
    )
  }
  return (
    <td
      className={`px-2 py-1.5 text-right tabular-nums ${
        locked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
      }`}
      title={locked ? 'Not accessible this year' : undefined}
    >
      {locked && <span className="mr-1">🔒</span>}
      {fmt(value)}
    </td>
  )
}
