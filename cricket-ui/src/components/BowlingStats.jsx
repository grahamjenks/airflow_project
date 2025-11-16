import { useState } from 'react'
import './BowlingStats.css'

function BowlingStats({ onSubmit, existingStats }) {
  const [formData, setFormData] = useState({
    playerName: '',
    overs: 0,
    maidens: 0,
    runs: 0,
    wickets: 0,
    wides: 0,
    noBalls: 0,
    team: '',
    innings: 1,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const calculateEconomy = () => {
    if (formData.overs === 0) return 0
    return (formData.runs / formData.overs).toFixed(2)
  }

  const calculateAverage = () => {
    if (formData.wickets === 0) return 'N/A'
    return (formData.runs / formData.wickets).toFixed(2)
  }

  const calculateStrikeRate = () => {
    if (formData.wickets === 0) return 'N/A'
    const balls = Math.floor(formData.overs) * 6 + ((formData.overs % 1) * 10)
    return (balls / formData.wickets).toFixed(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const stats = {
      ...formData,
      economy: calculateEconomy(),
      average: calculateAverage(),
      strikeRate: calculateStrikeRate(),
      timestamp: new Date().toISOString()
    }
    onSubmit(stats)
    setFormData({
      playerName: '',
      overs: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
      team: '',
      innings: 1,
    })
  }

  return (
    <div className="bowling-stats">
      <h2>Bowling Statistics</h2>
      
      {existingStats.length > 0 && (
        <div className="stats-summary">
          <h3>Recorded Bowling Stats ({existingStats.length})</h3>
          <div className="stats-grid">
            {existingStats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-header">
                  <strong>{stat.playerName}</strong>
                  <span className="team-badge">{stat.team}</span>
                </div>
                <div className="stat-details">
                  <div>{stat.overs} - {stat.maidens} - {stat.runs} - {stat.wickets}</div>
                  <div>Econ: {stat.economy}</div>
                  <div>Avg: {stat.average} | SR: {stat.strikeRate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bowling-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="playerName">Bowler Name</label>
            <input
              type="text"
              id="playerName"
              name="playerName"
              value={formData.playerName}
              onChange={handleChange}
              placeholder="Enter bowler name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="team">Team</label>
            <input
              type="text"
              id="team"
              name="team"
              value={formData.team}
              onChange={handleChange}
              placeholder="Enter team name"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="overs">Overs</label>
            <input
              type="number"
              id="overs"
              name="overs"
              value={formData.overs}
              onChange={handleChange}
              min="0"
              step="0.1"
              max="50"
              placeholder="e.g., 4.3 for 4.3 overs"
              required
            />
            <small>Format: overs.balls (e.g., 4.3 = 4 overs 3 balls)</small>
          </div>

          <div className="form-group">
            <label htmlFor="maidens">Maidens</label>
            <input
              type="number"
              id="maidens"
              name="maidens"
              value={formData.maidens}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="innings">Innings</label>
            <select 
              id="innings" 
              name="innings" 
              value={formData.innings}
              onChange={handleChange}
            >
              <option value={1}>1st Innings</option>
              <option value={2}>2nd Innings</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="runs">Runs Conceded</label>
            <input
              type="number"
              id="runs"
              name="runs"
              value={formData.runs}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wickets">Wickets</label>
            <input
              type="number"
              id="wickets"
              name="wickets"
              value={formData.wickets}
              onChange={handleChange}
              min="0"
              max="10"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="wides">Wides</label>
            <input
              type="number"
              id="wides"
              name="wides"
              value={formData.wides}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="noBalls">No Balls</label>
            <input
              type="number"
              id="noBalls"
              name="noBalls"
              value={formData.noBalls}
              onChange={handleChange}
              min="0"
            />
          </div>
        </div>

        {formData.overs > 0 && (
          <div className="calculated-stats">
            <div className="stat-display">
              <strong>Economy Rate:</strong> {calculateEconomy()} runs/over
            </div>
            {formData.wickets > 0 && (
              <>
                <div className="stat-display">
                  <strong>Bowling Average:</strong> {calculateAverage()} runs/wicket
                </div>
                <div className="stat-display">
                  <strong>Strike Rate:</strong> {calculateStrikeRate()} balls/wicket
                </div>
              </>
            )}
          </div>
        )}

        <button type="submit" className="submit-button">
          Add Bowling Stats
        </button>
      </form>
    </div>
  )
}

export default BowlingStats

