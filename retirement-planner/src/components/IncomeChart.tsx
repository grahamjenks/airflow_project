import {
  Bar,
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
import {
  ALERT_COLOR,
  DB_PENSION_COLOR,
  PENSION_COLORS,
  POT_COLORS,
  STATE_PENSION_COLOR,
} from './chartColors'
import { IncomeTooltip } from './IncomeTooltip'
import { makeYearAgeTick, yearAxisLabel } from './YearAxisTick'

interface IncomeChartProps {
  assumptions: Assumptions
  rows: YearRow[]
  drawdownYear: number | null
}

export function IncomeChart({ assumptions: a, rows, drawdownYear }: IncomeChartProps) {
  const lastYear = rows.length > 0 ? rows[rows.length - 1].year : 0
  const baseYear = rows.length > 0 ? rows[0].year : 0
  const hasDb = a.people.some((p) => p.pensionType === 'db')
  const dcPeople = a.people.filter((p) => p.pensionType === 'dc')
  const YearTick = makeYearAgeTick(rows)

  const data = rows.map((r) => {
    const point: Record<string, number> = {
      year: r.year,
      dbPension: r.dbIncomeTotal,
      statePension: r.statePensionTotal,
      shortfall: r.shortfall,
      outgoings: r.outgoings,
    }
    a.people.forEach((person) => {
      const py = r.people.find((x) => x.id === person.id)
      point[`salary_${person.id}`] = py?.takeHome ?? 0
      if (person.pensionType === 'dc') {
        point[`draw_pension_${person.id}`] = py?.pensionWithdrawal ?? 0
      }
    })
    a.pots.forEach((_pot, i) => {
      point[`draw_pot_${i}`] = r.potWithdrawals[i] ?? 0
    })
    return point
  })

  // Distinct shades so each person's salary is legible in the stack.
  const salaryShades = ['#94a3b8', '#cbd5e1']

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
          <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} tick={{ fontSize: 12 }} width={64} />
          <Tooltip content={<IncomeTooltip assumptions={a} rows={rows} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {a.people.map((person, i) => (
            <Bar
              key={person.id}
              dataKey={`salary_${person.id}`}
              name={`${person.name}: take-home`}
              stackId="income"
              fill={salaryShades[i % salaryShades.length]}
            />
          ))}
          {hasDb && (
            <Bar
              dataKey="dbPension"
              name="Salary-based pension"
              stackId="income"
              fill={DB_PENSION_COLOR}
            />
          )}
          <Bar
            dataKey="statePension"
            name="State pension"
            stackId="income"
            fill={STATE_PENSION_COLOR}
          />
          {dcPeople.map((person, i) => (
            <Bar
              key={`draw-${person.id}`}
              dataKey={`draw_pension_${person.id}`}
              name={`From ${person.name}: pension`}
              stackId="income"
              fill={PENSION_COLORS[i % PENSION_COLORS.length]}
            />
          ))}
          {a.pots.map((pot, i) => (
            <Bar
              key={`draw-pot-${pot.id}`}
              dataKey={`draw_pot_${i}`}
              name={`From ${pot.name}`}
              stackId="income"
              fill={POT_COLORS[i % POT_COLORS.length]}
            />
          ))}
          <Bar dataKey="shortfall" name="Shortfall" stackId="income" fill={ALERT_COLOR} />
          <Line
            type="monotone"
            dataKey="outgoings"
            name="Outgoings"
            stroke={ALERT_COLOR}
            strokeWidth={2}
            dot={false}
          />
          {a.people.map((person) => (
            <ReferenceLine
              key={person.id}
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
