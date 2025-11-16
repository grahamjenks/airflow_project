import './StatisticsView.css'

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

      <div className="stats-sections">
        <div className="stats-section">
          <h3>Batting Statistics</h3>
          {battingStats.length === 0 ? (
            <p className="no-data">No batting statistics recorded yet.</p>
          ) : (
            <>
              {battingTotals && (
                <div className="totals-card">
                  <h4>Team Totals</h4>
                  <div className="totals-grid">
                    <div><strong>Total Runs:</strong> {battingTotals.runs}</div>
                    <div><strong>Total Balls:</strong> {battingTotals.balls}</div>
                    <div><strong>Strike Rate:</strong> {battingTotals.strikeRate}</div>
                    <div><strong>Boundaries:</strong> {battingTotals.fours}×4, {battingTotals.sixes}×6</div>
                  </div>
                </div>
              )}
              <div className="stats-table-container">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Team</th>
                      <th>Runs</th>
                      <th>Balls</th>
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
                        <td>{stat.runs}</td>
                        <td>{stat.balls}</td>
                        <td>{stat.strikeRate}</td>
                        <td>{stat.fours}</td>
                        <td>{stat.sixes}</td>
                        <td>{stat.dismissalType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="stats-section">
          <h3>Bowling Statistics</h3>
          {bowlingStats.length === 0 ? (
            <p className="no-data">No bowling statistics recorded yet.</p>
          ) : (
            <>
              {bowlingTotals && (
                <div className="totals-card">
                  <h4>Team Totals</h4>
                  <div className="totals-grid">
                    <div><strong>Total Overs:</strong> {bowlingTotals.overs.toFixed(1)}</div>
                    <div><strong>Maidens:</strong> {bowlingTotals.maidens}</div>
                    <div><strong>Runs Conceded:</strong> {bowlingTotals.runs}</div>
                    <div><strong>Wickets:</strong> {bowlingTotals.wickets}</div>
                    <div><strong>Economy:</strong> {bowlingTotals.economy}</div>
                  </div>
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
                        <td>{stat.wickets}</td>
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
            <button 
              onClick={onSave}
              className="export-button save-button"
            >
              💾 Save Match
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
            📥 Export as JSON
          </button>
        </div>
      </div>
    </div>
  )
}

export default StatisticsView

