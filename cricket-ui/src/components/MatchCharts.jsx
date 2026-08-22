import {
  ComposedChart, Line, Bar, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import './MatchCharts.css'

// Series colors come from CSS custom properties so the charts re-theme
// (light/dark) with the rest of the app. Colored by team, so a Test match's
// four innings still only ever use two hues.
const SERIES_VARS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']
const ORDINAL = ['1st', '2nd', '3rd', '4th']
const ord = n => ORDINAL[n - 1] || `${n}th`

// ─── Derive over-by-over progression from ball-by-ball deliveries ─────────────
// Returns everything the worm (cumulative runs) and Manhattan (runs per over,
// with wickets) charts need, keyed by innings. Buckets by each delivery's
// `overNum` (0-based, the over it was bowled in — extras included).

export function buildInningsProgression(deliveries) {
  const list = (deliveries || []).filter(d => !d.isRetirement && d.extraType !== 'penalty')
  if (!list.length) {
    return { inningsNums: [], maxOver: 0, worm: [], manhattan: {}, teamByInnings: {} }
  }
  const inningsNums = [...new Set(list.map(d => d.innings))].sort((a, b) => a - b)
  const teamByInnings = {}
  const manhattan = {}
  const cumByInnings = {}   // n -> { cum: {overIdx -> cumRuns}, wkts: {overIdx -> count}, lastOver }
  let maxOver = 0

  for (const n of inningsNums) {
    const balls = list.filter(d => d.innings === n)
    teamByInnings[n] = balls[0]?.battingTeam || `Innings ${n}`
    const runsByOver = {}
    const wktsByOver = {}
    let lastOver = 0
    for (const d of balls) {
      const o = d.overNum || 0
      runsByOver[o] = (runsByOver[o] || 0) + d.batRuns + d.extraRuns
      if (d.wicket) wktsByOver[o] = (wktsByOver[o] || 0) + 1
      if (o > lastOver) lastOver = o
    }
    maxOver = Math.max(maxOver, lastOver)

    manhattan[n] = Array.from({ length: lastOver + 1 }, (_, o) => ({
      over: o + 1,
      runs: runsByOver[o] || 0,
      wkts: wktsByOver[o] || 0,
    }))

    const cum = {}
    let running = 0
    for (let o = 0; o <= lastOver; o++) {
      running += runsByOver[o] || 0
      cum[o] = running
    }
    cumByInnings[n] = { cum, wkts: wktsByOver, lastOver }
  }

  // Worm: one shared row per over so all innings share the x-axis. `i{n}` is
  // cumulative runs; `i{n}w` carries that same value only where a wicket fell,
  // so a scatter can drop a marker on the line exactly there.
  const worm = [{ over: 0 }]
  for (const n of inningsNums) worm[0][`i${n}`] = 0
  for (let o = 0; o <= maxOver; o++) {
    const row = { over: o + 1 }
    for (const n of inningsNums) {
      const { cum, wkts, lastOver } = cumByInnings[n]
      if (o <= lastOver) {
        row[`i${n}`] = cum[o]
        row[`i${n}w`] = (wkts[o] || 0) > 0 ? cum[o] : null
      } else {
        row[`i${n}`] = null
        row[`i${n}w`] = null
      }
    }
    worm.push(row)
  }

  return { inningsNums, maxOver: maxOver + 1, worm, manhattan, teamByInnings }
}

function buildTeamColors(inningsNums, teamByInnings) {
  const order = []
  for (const n of inningsNums) {
    const t = teamByInnings[n]
    if (!order.includes(t)) order.push(t)
  }
  const map = {}
  order.forEach((t, i) => { map[t] = SERIES_VARS[i % SERIES_VARS.length] })
  return map
}

// Red ring marker for a wicket — 2px surface ring keeps it legible where it
// overlaps the line/bar (per data-viz mark spec).
function WicketMarker({ cx, cy }) {
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={4.5} fill="var(--chart-wicket)" stroke="var(--surface)" strokeWidth={2} />
}

const AXIS = { fill: 'var(--chart-axis)', fontSize: 12 }

// ─── Worm: cumulative runs, one line per innings, wickets marked ──────────────

function WormTooltip({ active, payload, label, teamByInnings, inningsNums }) {
  if (!active || !payload?.length) return null
  const rows = inningsNums
    .map(n => {
      const p = payload.find(x => x.dataKey === `i${n}`)
      return p && p.value != null ? { n, team: teamByInnings[n], value: p.value, color: p.color } : null
    })
    .filter(Boolean)
  if (!rows.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-name">After over {label}</p>
      {rows.map(r => (
        <p key={r.n}>
          <span className="mc-swatch" style={{ background: r.color }} />
          {r.team} <span className="mc-muted">({ord(r.n)})</span>: <strong>{r.value}</strong>
        </p>
      ))}
    </div>
  )
}

function WormChart({ progression }) {
  const { inningsNums, worm, teamByInnings } = progression
  const colors = buildTeamColors(inningsNums, teamByInnings)
  return (
    <div className="chart-container">
      <h4 className="chart-title">Worm — cumulative runs</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={worm} margin={{ top: 10, right: 16, left: 0, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="over" type="number" domain={[0, 'dataMax']} allowDecimals={false}
            tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }}
            label={{ value: 'Overs', position: 'insideBottom', offset: -2, fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <YAxis
            tick={AXIS} tickLine={false} axisLine={false} width={40} allowDecimals={false}
          />
          <Tooltip
            content={<WormTooltip teamByInnings={teamByInnings} inningsNums={inningsNums} />}
            cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '4 4' }}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          {inningsNums.map(n => (
            <Line
              key={`l${n}`} type="monotone" dataKey={`i${n}`}
              name={`${teamByInnings[n]} (${ord(n)})`}
              stroke={colors[teamByInnings[n]]} strokeWidth={2.5}
              dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false}
            />
          ))}
          {inningsNums.map(n => (
            <Scatter
              key={`w${n}`} dataKey={`i${n}w`} shape={<WicketMarker />}
              legendType="none" isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mc-caption">
        <span className="mc-wicket-dot" /> wicket
      </p>
    </div>
  )
}

// ─── Manhattan: runs per over (one small chart per innings), wickets marked ───

function ManhattanTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="tooltip-name">Over {label}</p>
      <p>Runs: <strong>{d.runs}</strong></p>
      {d.wkts > 0 && <p><span className="mc-wicket-dot" /> {d.wkts} wicket{d.wkts > 1 ? 's' : ''}</p>}
    </div>
  )
}

function ManhattanChart({ innings, rows, color, team }) {
  // Marker sits at the top of the bar where a wicket fell.
  const data = rows.map(r => ({ ...r, wktMarker: r.wkts > 0 ? r.runs : null }))
  return (
    <div className="chart-container mc-manhattan">
      <h4 className="chart-title">
        Manhattan — {team} <span className="mc-muted">({ord(innings)} innings)</span>
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 14, right: 16, left: 0, bottom: 6 }} barCategoryGap="18%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="over" tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }}
            interval="preserveStartEnd"
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip
            content={<ManhattanTooltip />}
            cursor={{ fill: 'var(--chart-axis)', fillOpacity: 0.08 }}
          />
          <Bar dataKey="runs" fill={color} radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive={false}>
            {data.map((r, i) => (
              <Cell key={i} fill={color} fillOpacity={r.wkts > 0 ? 1 : 0.82} />
            ))}
          </Bar>
          <Scatter dataKey="wktMarker" shape={<WicketMarker />} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────

export default function MatchCharts({ deliveries }) {
  const progression = buildInningsProgression(deliveries)
  if (!progression.inningsNums.length) return null
  const colors = buildTeamColors(progression.inningsNums, progression.teamByInnings)

  return (
    <div className="stats-section mc-section">
      <h3>Innings Progression</h3>
      <WormChart progression={progression} />
      <div className="mc-manhattan-grid">
        {progression.inningsNums.map(n => (
          <ManhattanChart
            key={n}
            innings={n}
            rows={progression.manhattan[n]}
            team={progression.teamByInnings[n]}
            color={colors[progression.teamByInnings[n]]}
          />
        ))}
      </div>
    </div>
  )
}
