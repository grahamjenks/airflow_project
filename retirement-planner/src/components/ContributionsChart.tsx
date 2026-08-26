import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'
import type { Assumptions, YearRow } from '../lib/types'
import { PENSION_COLORS, POT_COLORS } from './chartColors'
import { makeYearAgeTick, yearAxisLabel } from './YearAxisTick'

interface ContributionsChartProps {
  assumptions: Assumptions
  rows: YearRow[]
}

/**
 * What goes *into* savings each year, split by destination — the mirror of the
 * income chart. Contributions stop at each person's retirement, so the stack
 * steps down as they finish work.
 */
export function ContributionsChart({ assumptions: a, rows }: ContributionsChartProps) {
  const baseYear = rows.length > 0 ? rows[0].year : 0
  const dcPeople = a.people.filter((p) => p.pensionType === 'dc')
  const YearTick = makeYearAgeTick(rows)

  const totalIn = (r: YearRow) =>
    r.potContributions.reduce((s, c) => s + c, 0) +
    r.people.reduce((s, p) => s + p.pensionContribution, 0)

  const lastPaying = rows.reduce((last, r, i) => (totalIn(r) > 0.5 ? i : last), 0)
  // Always run to the last retirement, even if contributions stop earlier —
  // otherwise the chart silently hides years where nothing is being saved.
  const lastRetirement = Math.max(
    0,
    ...a.people.map((p) => p.retirementAge - p.currentAge),
  )
  const endIndex = Math.min(rows.length - 1, Math.max(lastPaying, lastRetirement) + 2)
  const visible = rows.slice(0, endIndex + 1)

  const contributionsEndYear = rows[lastPaying]?.year
  const lastRetirementYear = rows[Math.min(rows.length - 1, lastRetirement)]?.year
  const stopsEarly =
    contributionsEndYear !== undefined &&
    lastRetirementYear !== undefined &&
    contributionsEndYear < lastRetirementYear - 1

  const data = visible.map((r) => {
    const point: Record<string, number> = { year: r.year }
    dcPeople.forEach((person) => {
      const py = r.people.find((x) => x.id === person.id)
      point[`pension_${person.id}`] = py?.pensionContribution ?? 0
    })
    a.pots.forEach((_pot, i) => {
      point[`pot_${i}`] = r.potContributions[i] ?? 0
    })
    return point
  })

  return (
    <div className="w-full">
      {stopsEarly && (
        <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Contributions stop in <strong>{contributionsEndYear}</strong>, but the last retirement
          isn't until <strong>{lastRetirementYear}</strong> — those years are shown empty. Check each
          pot's "Stop contributing at age" if that isn't intended.
        </p>
      )}
      <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 34, right: 16, left: 0, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis
            dataKey="year"
            tick={<YearTick />}
            height={42}
            interval="preserveStartEnd"
            minTickGap={24}
            label={{
              value: yearAxisLabel(rows),
              position: 'insideBottom',
              offset: -14,
              fontSize: 11,
            }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tick={{ fontSize: 12 }}
            width={64}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
            labelFormatter={(year) => {
              const row = rows.find((r) => r.year === Number(year))
              if (!row) return `${year}`
              const total =
                row.potContributions.reduce((s, c) => s + c, 0) +
                row.people.reduce((s, p) => s + p.pensionContribution, 0)
              return `${year} — ${row.people
                .map((p) => `${p.name} ${p.age}`)
                .join(', ')} · total ${formatCurrency(total)}`
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {dcPeople.map((person, i) => (
            <Bar
              key={person.id}
              dataKey={`pension_${person.id}`}
              name={`${person.name}: pension`}
              stackId="in"
              fill={PENSION_COLORS[i % PENSION_COLORS.length]}
            />
          ))}
          {a.pots.map((pot, i) => (
            <Bar
              key={pot.id}
              dataKey={`pot_${i}`}
              name={pot.name}
              stackId="in"
              fill={POT_COLORS[i % POT_COLORS.length]}
            />
          ))}

          {a.people.map((person) => {
            const year = baseYear + (person.retirementAge - person.currentAge)
            if (year > (visible[visible.length - 1]?.year ?? 0)) return null
            return (
              <ReferenceLine
                key={person.id}
                x={year}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: `${person.name} retires`,
                  position: 'top',
                  fontSize: 11,
                  fill: '#64748b',
                }}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}
