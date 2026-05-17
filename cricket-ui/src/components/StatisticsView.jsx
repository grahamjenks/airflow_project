import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import './StatisticsView.css'

const COLORS = ['#667eea', '#764ba2', '#38a169', '#e53e3e', '#dd6b20', '#3182ce', '#d69e2e', '#805ad5']

const DISMISSAL_COLORS = {
  'Caught': '#667eea',
  'Bowled': '#e53e3e',
  'LBW': '#dd6b20',
  'Run Out': '#38a169',
  'Stumped': '#d69e2e',
  'Hit Wicket': '#805ad5',
  'Retired Hurt': '#718096',
  'Not Out': '#3182ce',
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function StatisticsView({ matchData, battingStats, bowlingStats, onReset, onSave }) {
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

  return (
    <div className="statistics-view">
      <div className="view-header">
        <h2>Match Statistics Summary</h2>
        <button onClick={onReset} className="reset-button">
          Start New Match
        </button>
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
              <KpiCard label="Total Runs" value={battingTotals.runs} sub={`${battingTotals.balls} balls`} color="#667eea" />
              <KpiCard label="Team Strike Rate" value={battingTotals.strikeRate} sub="runs per 100 balls" color="#764ba2" />
              <KpiCard
                label="Boundaries"
                value={`${battingTotals.fours + battingTotals.sixes}`}
                sub={`${battingTotals.fours}×4  ${battingTotals.sixes}×6`}
                color="#dd6b20"
              />
            </>
          )}
          {topScorer && (
            <KpiCard label="Top Scorer" value={topScorer.runs} sub={topScorer.playerName} color="#38a169" />
          )}
          {bowlingTotals && (
            <>
              <KpiCard label="Total Wickets" value={bowlingTotals.wickets} sub={`${bowlingTotals.overs.toFixed(1)} overs`} color="#e53e3e" />
              <KpiCard label="Economy Rate" value={bowlingTotals.economy} sub="runs per over" color="#d69e2e" />
            </>
          )}
          {topWicketTaker && (
            <KpiCard label="Top Wickets" value={topWicketTaker.wickets} sub={topWicketTaker.playerName} color="#805ad5" />
          )}
          {bestEconomy && (
            <KpiCard label="Best Economy" value={bestEconomy.economy} sub={bestEconomy.playerName} color="#3182ce" />
          )}
        </div>
      )}

      <div className="stats-sections">
        {/* Batting Section */}
        <div className="stats-section">
          <h3>Batting Statistics</h3>
          {battingStats.length === 0 ? (
            <p className="no-data">No batting statistics recorded yet.</p>
          ) : (
            <>
              {battingChartData.length > 0 && (
                <div className="chart-container">
                  <h4 className="chart-title">Runs Scored</h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={battingChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fill: '#4a5568', fontSize: 13 }} />
                      <YAxis tick={{ fill: '#4a5568', fontSize: 13 }} />
                      <Tooltip content={<CustomBattingTooltip />} />
                      <Bar dataKey="Runs" radius={[6, 6, 0, 0]}>
                        {battingChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {dismissalData.length > 0 && (
                <div className="chart-row">
                  <div className="chart-container chart-half">
                    <h4 className="chart-title">Dismissal Breakdown</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={dismissalData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {dismissalData.map((entry, i) => (
                            <Cell key={i} fill={DISMISSAL_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="stats-table-container chart-half">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Team</th>
                          <th>R</th>
                          <th>B</th>
                          <th>SR</th>
                          <th>4s</th>
                          <th>6s</th>
                          <th>Dismissal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {battingStats.map((stat, index) => (
                          <tr key={index}>
                            <td>{stat.playerName}</td>
                            <td>{stat.team}</td>
                            <td><strong>{stat.runs}</strong></td>
                            <td>{stat.balls}</td>
                            <td>{stat.strikeRate}</td>
                            <td>{stat.fours}</td>
                            <td>{stat.sixes}</td>
                            <td>
                              <span className={`dismissal-badge dismissal-${(stat.dismissalType || '').toLowerCase().replace(' ', '-')}`}>
                                {stat.dismissalType}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bowling Section */}
        <div className="stats-section">
          <h3>Bowling Statistics</h3>
          {bowlingStats.length === 0 ? (
            <p className="no-data">No bowling statistics recorded yet.</p>
          ) : (
            <>
              {bowlingChartData.length > 0 && (
                <div className="chart-container">
                  <h4 className="chart-title">Wickets Taken</h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bowlingChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fill: '#4a5568', fontSize: 13 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#4a5568', fontSize: 13 }} />
                      <Tooltip content={<CustomBowlingTooltip />} />
                      <Bar dataKey="Wickets" radius={[6, 6, 0, 0]}>
                        {bowlingChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="stats-table-container">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Bowler</th>
                      <th>Team</th>
                      <th>O</th>
                      <th>M</th>
                      <th>R</th>
                      <th>W</th>
                      <th>Econ</th>
                      <th>Avg</th>
                      <th>SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowlingStats.map((stat, index) => (
                      <tr key={index}>
                        <td>{stat.playerName}</td>
                        <td>{stat.team}</td>
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
            </>
          )}
        </div>
      </div>

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
    </div>
  )
}

export default StatisticsView
