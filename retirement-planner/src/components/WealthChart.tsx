import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrencyCompact } from '../lib/format'
import type { Assumptions, YearRow } from '../lib/types'
import { ALERT_COLOR, PENSION_COLORS, POT_COLORS } from './chartColors'
import { WealthTooltip } from './WealthTooltip'
import { makeYearAgeTick, yearAxisLabel } from './YearAxisTick'

export type WealthChartMode = 'stacked' | 'lines'

interface WealthChartProps {
  assumptions: Assumptions
  rows: YearRow[]
  shortfallYear: number | null
  drawdownYear: number | null
  unlocks: { t: number; label: string }[]
  mode: WealthChartMode
}

function baseYearOf(rows: { year: number }[]): number {
  return rows.length > 0 ? rows[0].year : 0
}

export function WealthChart({
  assumptions: a,
  rows,
  shortfallYear,
  drawdownYear,
  unlocks,
  mode,
}: WealthChartProps) {
  const lastYear = rows.length > 0 ? rows[rows.length - 1].year : 0
  const baseYear = rows.length > 0 ? rows[0].year : 0
  const dcPeople = a.people.filter((p) => p.pensionType === 'dc')
  const YearTick = makeYearAgeTick(rows)
  // A drawdown marker sitting on a retirement year would print on top of it.
  const retirementYears = new Set(
    a.people.map((p) => baseYearOf(rows) + (p.retirementAge - p.currentAge)),
  )

  const data = rows.map((r) => {
    const point: Record<string, number> = { year: r.year }
    dcPeople.forEach((person) => {
      const py = r.people.find((x) => x.id === person.id)
      point[`pension_${person.id}`] = py ? py.pensionPot : 0
    })
    a.pots.forEach((_pot, i) => {
      point[`pot_${i}`] = r.potBalances[i] ?? 0
    })
    return point
  })

  const series = [
    ...dcPeople.map((person, i) => ({
      key: `pension_${person.id}`,
      name: `${person.name}: pension`,
      color: PENSION_COLORS[i % PENSION_COLORS.length],
    })),
    ...a.pots.map((pot, i) => ({
      key: `pot_${i}`,
      name: pot.name,
      color: POT_COLORS[i % POT_COLORS.length],
    })),
  ]

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 34, right: 16, left: 0, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          {drawdownYear !== null && (
            <ReferenceArea
              x1={drawdownYear}
              x2={lastYear}
              fill={ALERT_COLOR}
              fillOpacity={0.06}
              label={{
                value: 'Drawdown phase',
                position: 'insideTopRight',
                fontSize: 11,
                fill: ALERT_COLOR,
              }}
            />
          )}
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
          <Tooltip content={<WealthTooltip assumptions={a} rows={rows} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {mode === 'stacked'
            ? series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stackId="1"
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.55}
                />
              ))
            : series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}

          {unlocks.map((u) => (
            <ReferenceLine
              key={`${u.label}-${u.t}`}
              x={baseYear + u.t}
              stroke="#94a3b8"
              strokeDasharray="2 4"
              label={{
                value: `🔓 ${u.label}`,
                position: 'insideBottomLeft',
                fontSize: 10,
                fill: '#94a3b8',
              }}
            />
          ))}
          {a.people.map((person) => (
            <ReferenceLine
              key={`retire-${person.id}`}
              x={baseYear + (person.retirementAge - person.currentAge)}
              stroke="#64748b"
              strokeDasharray="4 4"
              label={{
                value: `${person.name} retires`,
                position: 'top',
                fontSize: 11,
                fill: '#64748b',
              }}
            />
          ))}
          {drawdownYear !== null && (
            <ReferenceLine
              x={drawdownYear}
              stroke={ALERT_COLOR}
              strokeWidth={2}
              label={
                retirementYears.has(drawdownYear)
                  ? undefined
                  : {
                      value: 'Drawdown starts',
                      position: 'top',
                      fontSize: 11,
                      fill: ALERT_COLOR,
                    }
              }
            />
          )}
          {shortfallYear && (
            <ReferenceLine
              x={shortfallYear}
              stroke={ALERT_COLOR}
              strokeDasharray="4 4"
              label={{ value: 'Shortfall', position: 'top', fontSize: 12, fill: ALERT_COLOR }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
