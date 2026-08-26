import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'
import { effectiveAccessAge, potOwner, realRate, schemePensionAge } from '../lib/projection'
import { eventNoteFor, milestoneYears, selectRows } from '../lib/tableRows'
import type { Assumptions, YearRow } from '../lib/types'
import { DB_PENSION_COLOR, PENSION_COLORS, POT_COLORS } from './chartColors'
import { SegmentedToggle } from './SegmentedToggle'

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
  // Salary-based schemes build an annual income rather than a pot, so each one
  // gets its own column and stays out of the Total.
  const dbSchemeCols = useMemo(
    () =>
      a.people
        .filter((p) => p.pensionType === 'db')
        .flatMap((person) =>
          person.dbSchemes.map((scheme) => ({
            key: `${person.id}:${scheme.id}`,
            personId: person.id,
            schemeId: scheme.id,
            label: a.people.length > 1 ? `${person.name}: ${scheme.name}` : scheme.name,
            pensionAge: schemePensionAge(scheme, person),
          })),
        ),
    [a.people],
  )
  const showDbSchemes = !showingDrawdown && dbSchemeCols.length > 0
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
        <div className="flex flex-wrap items-center gap-2">
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
        {showingBreakdown
            ? `Each savings pot year by year: start + interest + contributions ${a.oneOffEvents.length > 0 ? '+ one-offs ' : ''}− withdrawals = end. Interest is real growth after ${a.inflationRate}% inflation — ${a.pots.map((p) => `${p.name} ${p.growthRate}% → ${(realRate(p.growthRate, a.inflationRate) * 100).toFixed(2)}%`).join(', ')}.`
            : showingDrawdown
              ? "How much came out of each pot each year. A pot can only be drawn on once it's unlocked."
              : `Balance of every pot and pension at each year. Greyed values with 🔒 aren't accessible yet.${
                  showDbSchemes
                    ? ' Salary-based schemes hold no pot, so they show the pension built up so far — a yearly income, kept out of the Total.'
                    : ''
                }`}
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
              {showDbSchemes &&
                dbSchemeCols.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 text-right font-semibold whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: DB_PENSION_COLOR }}
                      />
                      {col.label}
                      <span className="font-normal text-slate-400 dark:text-slate-500">a year</span>
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
                  {showDbSchemes &&
                    dbSchemeCols.map((col) => {
                      const py = row.people.find((x) => x.id === col.personId)
                      const scheme = py?.dbSchemes.find((s) => s.id === col.schemeId)
                      return (
                        <AccruedCell
                          key={col.key}
                          fmt={fmt}
                          value={scheme?.accrued ?? 0}
                          paying={(py?.age ?? 0) >= col.pensionAge}
                          pensionAge={col.pensionAge}
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
  const hasOneOffs = a.oneOffEvents.length > 0
  const cols = hasOneOffs
    ? ['Start', 'Interest', 'In', 'One-off', 'Out', 'End']
    : ['Start', 'Interest', 'In', 'Out', 'End']
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
                colSpan={cols.length}
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
                  const oneOff = row.potOneOffs[i] ?? 0
                  const out = row.potWithdrawals[i] ?? 0
                  const end = row.potBalances[i] ?? 0
                  return (
                    <Fragment key={pot.id}>
                      <Num fmt={fmt} value={start} groupStart />
                      <Num fmt={fmt} value={interest} tone="grow" />
                      <Num fmt={fmt} value={paidIn} tone="in" />
                      {hasOneOffs && <Num fmt={fmt} value={oneOff} tone="oneOff" signed />}
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
  signed = false,
  tone,
}: {
  value: number
  fmt: (n: number) => string
  groupStart?: boolean
  bold?: boolean
  /** Show the sign, for a column that carries money both ways. */
  signed?: boolean
  tone?: 'grow' | 'in' | 'out' | 'oneOff'
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
          : tone === 'oneOff'
            ? value < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-violet-600 dark:text-violet-400'
            : 'text-slate-700 dark:text-slate-200'
  return (
    <td
      className={`px-2 py-1.5 text-right tabular-nums ${toneClass} ${bold ? 'font-semibold' : ''} ${
        groupStart ? 'border-l border-slate-300 dark:border-slate-500' : ''
      }`}
    >
      {zero
        ? '—'
        : signed
          ? `${value > 0 ? '+' : '-'}${fmt(Math.abs(value))}`
          : `${tone === 'out' && value > 0 ? '-' : ''}${fmt(value)}`}
    </td>
  )
}

/**
 * A salary-based scheme's accrued pension. This is an annual income rather
 * than a balance, so it is coloured as guaranteed income and never folded
 * into the Total alongside the pot columns.
 */
function AccruedCell({
  value,
  fmt,
  paying,
  pensionAge,
}: {
  value: number
  fmt: (n: number) => string
  paying: boolean
  pensionAge: number
}) {
  if (value < 0.5) {
    return (
      <td className="px-2 py-1.5 text-right tabular-nums text-slate-300 dark:text-slate-600">—</td>
    )
  }
  return (
    <td
      className={`px-2 py-1.5 text-right tabular-nums ${
        paying ? 'text-violet-600 dark:text-violet-400' : 'text-violet-400 dark:text-violet-300/60'
      }`}
      title={
        paying
          ? `Being paid — ${fmt(value)} a year for life`
          : `Built up so far — first paid at ${pensionAge}`
      }
    >
      {!paying && <span className="mr-1">🔒</span>}
      {fmt(value)}
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
