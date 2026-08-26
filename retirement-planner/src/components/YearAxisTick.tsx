import type { YearRow } from '../lib/types'

interface TickProps {
  x?: number
  y?: number
  payload?: { value?: number | string }
}

/**
 * X-axis tick showing the calendar year with everyone's age beneath it, so a
 * point on the chart can be read as "2041 — she's 55, he's 57" without
 * counting along from today.
 */
export function makeYearAgeTick(rows: YearRow[]) {
  const agesByYear = new Map<number, number[]>()
  rows.forEach((r) => agesByYear.set(r.year, r.people.map((p) => p.age)))

  return function YearAgeTick({ x = 0, y = 0, payload }: TickProps) {
    const year = Number(payload?.value)
    const ages = agesByYear.get(year)
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} className="fill-slate-500">
          {year}
        </text>
        {ages && ages.length > 0 && (
          <text x={0} y={0} dy={24} textAnchor="middle" fontSize={10} className="fill-slate-400">
            {ages.join('·')}
          </text>
        )}
      </g>
    )
  }
}

/** "Year · ages (Me · Partner)" — names the numbers under each tick. */
export function yearAxisLabel(rows: YearRow[]): string {
  const names = rows[0]?.people.map((p) => p.name) ?? []
  return names.length > 0 ? `Year · ages (${names.join(' · ')})` : 'Year'
}
