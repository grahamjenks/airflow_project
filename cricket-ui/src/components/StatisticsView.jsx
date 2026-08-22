import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import MatchCharts from './MatchCharts'
import './StatisticsView.css'

// ─── Delivery-derived helpers ────────────────────────────────────────

function inningsBatting(deliveries, n) {
  return (deliveries || []).find(d => d.innings === n)?.battingTeam || `Innings ${n}`
}

function buildFallOfWickets(deliveries) {
  if (!deliveries?.length) return []
  const nums = [...new Set(deliveries.map(d => d.innings))].sort()
  return nums.map(n => {
    const balls = deliveries.filter(d => d.innings === n && !d.isRetirement)
    const wickets = []
    let runs = 0, legal = 0
    for (const d of balls) {
      runs += d.batRuns + d.extraRuns
      if (d.isLegalDelivery) legal++
      if (d.wicket) {
        const ov = Math.floor(legal / 6), rem = legal % 6
        wickets.push({ wicket: wickets.length + 1, runs, over: `${ov}.${rem}`, batsman: d.wicket.outBatsman, how: d.wicket.type })
      }
    }
    return { innings: n, team: inningsBatting(deliveries, n), wickets }
  }).filter(x => x.wickets.length > 0)
}

function buildExtras(deliveries) {
  if (!deliveries?.length) return []
  const nums = [...new Set(deliveries.map(d => d.innings))].sort()
  return nums.map(n => {
    const balls = deliveries.filter(d => d.innings === n && !d.isRetirement)
    const wides   = balls.filter(d => d.extraType === 'wide').reduce((s, d) => s + d.extraRuns, 0)
    const noBalls = balls.filter(d => d.extraType === 'noball').reduce((s, d) => s + d.extraRuns, 0)
    const byes    = balls.filter(d => d.extraType === 'bye').reduce((s, d) => s + d.extraRuns, 0)
    const legByes = balls.filter(d => d.extraType === 'legbye').reduce((s, d) => s + d.extraRuns, 0)
    return { innings: n, team: inningsBatting(deliveries, n), wides, noBalls, byes, legByes, total: wides + noBalls + byes + legByes }
  }).filter(e => e.total > 0)
}

const ORDINAL = ['1st', '2nd', '3rd', '4th']

// Chart colors reference the --series-*/theme tokens (index.css) so every chart
// re-themes for light/dark instead of being pinned to light-mode hex.
const CHART_GRID = 'var(--chart-grid)'
const CHART_AXIS = { fill: 'var(--chart-axis)', fontSize: 13 }
const SERIES_BAT = 'var(--series-1)'
const SERIES_BOWL = 'var(--series-2)'

const DISMISSAL_COLORS = {
  'Caught': 'var(--series-1)',
  'Bowled': 'var(--chart-wicket)',
  'LBW': 'var(--series-4)',
  'Run Out': 'var(--series-2)',
  'Stumped': 'var(--warning-solid)',
  'Hit Wicket': 'var(--series-3)',
  'Retired Hurt': 'var(--neutral-solid)',
  'Not Out': 'var(--info-solid)',
}
const PIE_FALLBACK = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--brand-2)', 'var(--info)']

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function StatisticsView({ matchData, battingStats, bowlingStats, deliveries = [], onReset, onSave, onViewScorecard }) {
  const fallOfWickets = buildFallOfWickets(deliveries)
  const extrasData    = buildExtras(deliveries)
  const calculateBattingTotals = () => {
    if (battingStats.length === 0) return null
    const totals = battingStats.reduce((acc, stat) => {
      acc.runs += parseInt(stat.runs)
      acc.balls += parseInt(stat.balls)
      acc.fours += parseInt(stat.fours)
      acc.sixes += parseInt(stat.sixes)
      return acc
    }, { runs: 0, balls: 0, fours: 0, sixes: 0 })
    return {
      ...totals,
      strikeRate: totals.balls > 0 ? ((totals.runs / totals.balls) * 100).toFixed(2) : 0
    }
  }

  const calculateBowlingTotals = () => {
    if (bowlingStats.length === 0) return null
    const totals = bowlingStats.reduce((acc, stat) => {
      acc.overs += parseFloat(stat.overs)
      acc.maidens += parseInt(stat.maidens)
      acc.runs += parseInt(stat.runs)
      acc.wickets += parseInt(stat.wickets)
      return acc
    }, { overs: 0, maidens: 0, runs: 0, wickets: 0 })
    return {
      ...totals,
      economy: totals.overs > 0 ? (totals.runs / totals.overs).toFixed(2) : 0
    }
  }

  const battingTotals = calculateBattingTotals()
  const bowlingTotals = calculateBowlingTotals()

  const topScorer = battingStats.length > 0
    ? battingStats.reduce((best, s) => parseInt(s.runs) > parseInt(best.runs) ? s : best, battingStats[0])
    : null

  const topWicketTaker = bowlingStats.length > 0
    ? bowlingStats.reduce((best, s) => parseInt(s.wickets) > parseInt(best.wickets) ? s : best, bowlingStats[0])
    : null

  const bestEconomy = bowlingStats.length > 0
    ? bowlingStats.filter(s => parseFloat(s.overs) > 0).reduce((best, s) => parseFloat(s.economy) < parseFloat(best.economy) ? s : best, bowlingStats[0])
    : null

  const battingChartData = battingStats.map(s => ({
    name: s.playerName.split(' ').pop(),
    fullName: s.playerName,
    Runs: parseInt(s.runs),
    Balls: parseInt(s.balls),
  }))

  const bowlingChartData = bowlingStats.map(s => ({
    name: s.playerName.split(' ').pop(),
    fullName: s.playerName,
    Wickets: parseInt(s.wickets),
    Runs: parseInt(s.runs),
  }))

  const dismissalCounts = battingStats.reduce((acc, s) => {
    const type = s.dismissalType || 'Not Out'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const dismissalData = Object.entries(dismissalCounts).map(([name, value]) => ({ name, value }))

  const CustomBattingTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="chart-tooltip">
        <p className="tooltip-name">{d.fullName}</p>
        <p>Runs: <strong>{d.Runs}</strong></p>
        <p>Balls: <strong>{d.Balls}</strong></p>
        {d.Balls > 0 && <p>SR: <strong>{((d.Runs / d.Balls) * 100).toFixed(1)}</strong></p>}
      </div>
    )
  }

  const CustomBowlingTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="chart-tooltip">
        <p className="tooltip-name">{d.fullName}</p>
        <p>Wickets: <strong>{d.Wickets}</strong></p>
        <p>Runs: <strong>{d.Runs}</strong></p>
      </div>
    )
  }

  const team1 = matchData?.team1 || ''
  const team2 = matchData?.team2 || ''
  const teams = [team1, team2].filter(Boolean)

  const battingByTeam = teams.map(team => battingStats.filter(s => s.team === team))
  const bowlingByTeam = teams.map(team => bowlingStats.filter(s => s.team === team))

  return (
    <div className="statistics-view">
      <div className="view-header">
        <h2>Match Statistics</h2>
        <div className="view-header__actions">
          {onViewScorecard && (
            <button onClick={onViewScorecard} className="export-button">
              ← Back to Scorecard
            </button>
          )}
          <button onClick={() => window.print()} className="print-button">
            Print Scorecard
          </button>
          <button onClick={onReset} className="reset-button">
            Start New Match
          </button>
        </div>
      </div>

      {matchData && (
        <div className="match-info-card">
          <h3>Match Information</h3>
          <div className="match-info-grid">
            <div><strong>Match Type:</strong> {matchData.matchType}</div>
            <div><strong>Format:</strong> {matchData.format}</div>
            <div><strong>Teams:</strong> {matchData.team1} vs {matchData.team2}</div>
            <div><strong>Venue:</strong> {matchData.venue}</div>
            <div><strong>Date:</strong> {new Date(matchData.date).toLocaleDateString()}</div>
            {matchData.tossWinner && (
              <>
                <div><strong>Toss Winner:</strong> {matchData.tossWinner}</div>
                <div><strong>Toss Decision:</strong> {matchData.tossDecision}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* KPI Hero Cards */}
      {(battingTotals || bowlingTotals) && (
        <div className="kpi-row">
          {battingTotals && (
            <>
              <KpiCard label="Total Runs" value={battingTotals.runs} sub={`${battingTotals.balls} balls`} color="var(--series-1)" />
              <KpiCard label="Team Strike Rate" value={battingTotals.strikeRate} sub="runs per 100 balls" color="var(--brand-2)" />
              <KpiCard
                label="Boundaries"
                value={`${battingTotals.fours + battingTotals.sixes}`}
                sub={`${battingTotals.fours}×4  ${battingTotals.sixes}×6`}
                color="var(--series-4)"
              />
            </>
          )}
          {topScorer && (
            <KpiCard label="Top Scorer" value={topScorer.runs} sub={topScorer.playerName} color="var(--series-2)" />
          )}
          {bowlingTotals && (
            <>
              <KpiCard label="Total Wickets" value={bowlingTotals.wickets} sub={`${bowlingTotals.overs.toFixed(1)} overs`} color="var(--chart-wicket)" />
              <KpiCard label="Economy Rate" value={bowlingTotals.economy} sub="runs per over" color="var(--warning-solid)" />
            </>
          )}
          {topWicketTaker && (
            <KpiCard label="Top Wickets" value={topWicketTaker.wickets} sub={topWicketTaker.playerName} color="var(--series-3)" />
          )}
          {bestEconomy && (
            <KpiCard label="Best Economy" value={bestEconomy.economy} sub={bestEconomy.playerName} color="var(--info-solid)" />
          )}
        </div>
      )}

      <div className="stats-sections">
        {/* Batting Section — split by team */}
        <div className="stats-section">
          <h3>Batting</h3>
          {battingStats.length === 0 && <p className="no-data">No batting statistics recorded yet.</p>}

          {battingChartData.length > 0 && (
            <div className="chart-container">
              <h4 className="chart-title">Runs Scored</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={battingChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" tick={CHART_AXIS} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                  <YAxis tick={CHART_AXIS} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomBattingTooltip />} cursor={{ fill: 'var(--chart-axis)', fillOpacity: 0.08 }} />
                  <Bar dataKey="Runs" radius={[6, 6, 0, 0]} fill={SERIES_BAT} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {(teams.length > 0 ? teams : ['All']).map((team, ti) => {
            const stats = teams.length > 0 ? battingByTeam[ti] : battingStats
            if (!stats.length) return null
            return (
              <div key={team} className="team-stats-block">
                <h4 className="team-stats-label">{team} — Batting</h4>
                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr><th>Player</th><th>Inn</th><th>R</th><th>B</th><th>SR</th><th>4s</th><th>6s</th><th>Dismissal</th></tr>
                    </thead>
                    <tbody>
                      {stats.map((stat, i) => (
                        <tr key={i}>
                          <td>{stat.playerName}</td>
                          <td>{stat.innings}</td>
                          <td><strong>{stat.runs}</strong></td>
                          <td>{stat.balls}</td>
                          <td>{stat.strikeRate}</td>
                          <td>{stat.fours}</td>
                          <td>{stat.sixes}</td>
                          <td>
                            <span className={`dismissal-badge dismissal-${(stat.dismissalType || '').toLowerCase().replace(/ /g, '-')}`}>
                              {stat.dismissalType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {dismissalData.length > 0 && (
            <div className="chart-container chart-half" style={{ marginTop: '1.5rem' }}>
              <h4 className="chart-title">Dismissal Breakdown</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={dismissalData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {dismissalData.map((entry, i) => (
                      <Cell key={i} fill={DISMISSAL_COLORS[entry.name] || PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bowling Section — split by team */}
        <div className="stats-section">
          <h3>Bowling</h3>
          {bowlingStats.length === 0 && <p className="no-data">No bowling statistics recorded yet.</p>}

          {bowlingChartData.length > 0 && (
            <div className="chart-container">
              <h4 className="chart-title">Wickets Taken</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bowlingChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" tick={CHART_AXIS} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                  <YAxis allowDecimals={false} tick={CHART_AXIS} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomBowlingTooltip />} cursor={{ fill: 'var(--chart-axis)', fillOpacity: 0.08 }} />
                  <Bar dataKey="Wickets" radius={[6, 6, 0, 0]} fill={SERIES_BOWL} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {(teams.length > 0 ? teams : ['All']).map((team, ti) => {
            const stats = teams.length > 0 ? bowlingByTeam[ti] : bowlingStats
            if (!stats.length) return null
            return (
              <div key={team} className="team-stats-block">
                <h4 className="team-stats-label">{team} — Bowling</h4>
                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr><th>Bowler</th><th>Inn</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th><th>Avg</th><th>SR</th></tr>
                    </thead>
                    <tbody>
                      {stats.map((stat, i) => (
                        <tr key={i}>
                          <td>{stat.playerName}</td>
                          <td>{stat.innings}</td>
                          <td>{stat.overs}</td>
                          <td>{stat.maidens}</td>
                          <td>{stat.runs}</td>
                          <td><strong>{stat.wickets}</strong></td>
                          <td>{stat.economy}</td>
                          <td>{stat.average}</td>
                          <td>{stat.strikeRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Innings Progression: worm + Manhattan ── */}
      <MatchCharts deliveries={deliveries} />

      {/* ── Fall of Wickets ── */}
      {fallOfWickets.length > 0 && (
        <div className="stats-section">
          <h3>Fall of Wickets</h3>
          {fallOfWickets.map(({ innings, team, wickets }) => (
            <div key={innings} className="team-stats-block">
              <h4 className="team-stats-label">{team} — {ORDINAL[innings - 1] || `${innings}th`} Innings</h4>
              <div className="stats-table-container">
                <table className="stats-table">
                  <thead>
                    <tr><th>Wkt</th><th>Score</th><th>Over</th><th>Batsman</th><th>How Out</th></tr>
                  </thead>
                  <tbody>
                    {wickets.map((w, i) => (
                      <tr key={i}>
                        <td><strong>{w.wicket}</strong></td>
                        <td><strong>{w.runs}</strong></td>
                        <td>{w.over}</td>
                        <td>{w.batsman}</td>
                        <td><span className={`dismissal-badge dismissal-${(w.how || '').toLowerCase().replace(/ /g, '-')}`}>{w.how}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Extras Breakdown ── */}
      {extrasData.length > 0 && (
        <div className="stats-section">
          <h3>Extras</h3>
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr><th>Innings</th><th>Wides</th><th>No Balls</th><th>Byes</th><th>Leg Byes</th><th>Total</th></tr>
              </thead>
              <tbody>
                {extrasData.map((e, i) => (
                  <tr key={i}>
                    <td>{e.team} <span style={{ color: 'var(--text-faint)', fontSize: '0.8em' }}>({ORDINAL[e.innings - 1]})</span></td>
                    <td>{e.wides}</td>
                    <td>{e.noBalls}</td>
                    <td>{e.byes}</td>
                    <td>{e.legByes}</td>
                    <td><strong>{e.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="export-section">
        <h3>Export Data</h3>
        <div className="export-buttons">
          {onSave && (
            <button onClick={onSave} className="export-button save-button">
              Save Match
            </button>
          )}
          <button
            onClick={() => {
              const data = { matchData, battingStats, bowlingStats }
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `cricket-stats-${matchData?.date || 'match'}.json`
              a.click()
            }}
            className="export-button"
          >
            Export as JSON
          </button>
        </div>
      </div>

      {/* ── Print-only scorecard ── */}
      <PrintScorecard matchData={matchData} battingStats={battingStats} bowlingStats={bowlingStats} fallOfWickets={fallOfWickets} extrasData={extrasData} />
    </div>
  )
}

function fmtDismissal(stat) {
  const d = stat.dismissalType
  if (!d || d === 'Not Out') return 'not out'
  if (d === 'Bowled') return `b ${stat.bowler || ''}`
  if (d === 'LBW') return `lbw b ${stat.bowler || ''}`
  if (d === 'Caught') return `c ${stat.fielder ? stat.fielder + ' ' : ''}b ${stat.bowler || ''}`
  if (d === 'Stumped') return `st ${stat.fielder ? stat.fielder + ' ' : ''}b ${stat.bowler || ''}`
  if (d === 'Hit Wicket') return `hit wkt b ${stat.bowler || ''}`
  if (d === 'Run Out') return `run out${stat.fielder ? ` (${stat.fielder})` : ''}`
  if (d === 'Retired Hurt') return 'ret hurt'
  return d
}

function PrintScorecard({ matchData, battingStats, bowlingStats, fallOfWickets, extrasData }) {
  const inningNums = [...new Set([...battingStats.map(s => s.innings), ...bowlingStats.map(s => s.innings)])].sort()
  return (
    <div className="print-only">
      <h2>{matchData?.team1 || 'Team 1'} vs {matchData?.team2 || 'Team 2'}</h2>
      <div className="print-scorecard-meta">
        {matchData?.venue && <span>{matchData.venue} · </span>}
        {matchData?.date && <span>{new Date(matchData.date).toLocaleDateString()} · </span>}
        {matchData?.matchType && <span>{matchData.matchType}</span>}
      </div>

      {inningNums.map(n => {
        const batting = battingStats.filter(s => s.innings === n)
        const bowling = bowlingStats.filter(s => s.innings === n)
        const battingTeam = batting[0]?.team || ''
        const fow = (fallOfWickets || []).find(f => f.innings === n)
        const extras = (extrasData || []).find(e => e.innings === n)
        const totalRuns = batting.reduce((s, b) => s + (Number(b.runs) || 0), 0)
        const totalBalls = batting.reduce((s, b) => s + (Number(b.balls) || 0), 0)
        const wickets = batting.filter(b => b.dismissalType && b.dismissalType !== 'Not Out' && b.dismissalType !== 'Retired Hurt').length
        const extrasTotal = extras ? extras.total : 0
        return (
          <div key={n}>
            <h3>{battingTeam} — {n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} Innings</h3>

            <table className="print-scorecard-table">
              <thead>
                <tr><th>Batter</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
              </thead>
              <tbody>
                {batting.map((s, i) => (
                  <tr key={i}>
                    <td>{s.playerName}</td>
                    <td>{fmtDismissal(s)}</td>
                    <td><strong>{s.runs}</strong></td>
                    <td>{s.balls}</td>
                    <td>{s.fours}</td>
                    <td>{s.sixes}</td>
                    <td>{s.strikeRate}</td>
                  </tr>
                ))}
                {extras && (
                  <tr>
                    <td>Extras</td>
                    <td style={{ fontSize: '8pt' }}>
                      {extras.wides > 0 ? `wd ${extras.wides}` : ''}
                      {extras.noBalls > 0 ? ` nb ${extras.noBalls}` : ''}
                      {extras.byes > 0 ? ` b ${extras.byes}` : ''}
                      {extras.legByes > 0 ? ` lb ${extras.legByes}` : ''}
                    </td>
                    <td colSpan={5}><strong>{extrasTotal}</strong></td>
                  </tr>
                )}
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td colSpan={5}><strong>{totalRuns + extrasTotal}/{wickets}</strong> ({totalBalls > 0 ? `${Math.floor(totalBalls / 6)}.${totalBalls % 6} ov` : '—'})</td>
                </tr>
              </tbody>
            </table>

            {fow && fow.wickets.length > 0 && (
              <div className="print-fow">
                <strong>Fall of wickets:</strong>{' '}
                {fow.wickets.map((w, i) => (
                  <span key={i}>{w.wicket}-{w.runs} ({w.batsman}, {w.over}){i < fow.wickets.length - 1 ? ', ' : ''}</span>
                ))}
              </div>
            )}

            {bowling.length > 0 && (
              <table className="print-scorecard-table">
                <thead>
                  <tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Wd</th><th>Nb</th><th>Econ</th></tr>
                </thead>
                <tbody>
                  {bowling.map((s, i) => (
                    <tr key={i}>
                      <td>{s.playerName}</td>
                      <td>{s.overs}</td>
                      <td>{s.maidens}</td>
                      <td>{s.runs}</td>
                      <td><strong>{s.wickets}</strong></td>
                      <td>{s.wides || 0}</td>
                      <td>{s.noBalls || 0}</td>
                      <td>{s.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default StatisticsView
