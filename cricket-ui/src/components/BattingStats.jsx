import { useState } from 'react'
import './BattingStats.css'

function BattingStats({ onSubmit, existingStats }) {
  const [formData, setFormData] = useState({
    playerName: '',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissalType: 'Not Out',
    bowler: '',
    fielder: '',
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

  const calculateStrikeRate = () => {
    if (formData.balls === 0) return 0
    return ((formData.runs / formData.balls) * 100).toFixed(2)
  }

  const calculateAverage = () => {
    if (existingStats.length === 0) {
      return formData.dismissalType === 'Not Out' ? 'N/A' : formData.runs.toFixed(2)
    }
    const totalRuns = existingStats.reduce((sum, stat) => sum + parseInt(stat.runs), 0) + parseInt(formData.runs)
    const dismissals = existingStats.filter(stat => stat.dismissalType !== 'Not Out').length + (formData.dismissalType !== 'Not Out' ? 1 : 0)
    if (dismissals === 0) return 'N/A'
    return (totalRuns / dismissals).toFixed(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const stats = {
      ...formData,
      strikeRate: calculateStrikeRate(),
      timestamp: new Date().toISOString()
    }
    onSubmit(stats)
    setFormData({
      playerName: '',
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dismissalType: 'Not Out',
      bowler: '',
      fielder: '',
      team: '',
      innings: 1,
    })
  }

  return (
    <div className="batting-stats">
      <h2>Batting Statistics</h2>
      
      {existingStats.length > 0 && (
        <div className="stats-summary">
          <h3>Recorded Batting Stats ({existingStats.length})</h3>
          <div className="stats-grid">
            {existingStats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-header">
                  <strong>{stat.playerName}</strong>
                  <span className="team-badge">{stat.team}</span>
                </div>
                <div className="stat-details">
                  <div>{stat.runs} ({stat.balls})</div>
                  <div>SR: {stat.strikeRate}</div>
                  <div>{stat.fours}×4, {stat.sixes}×6</div>
                  <div className="dismissal">{stat.dismissalType}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="batting-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="playerName">Player Name</label>
            <input
              type="text"
              id="playerName"
              name="playerName"
              value={formData.playerName}
              onChange={handleChange}
              placeholder="Enter player name"
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
            <label htmlFor="runs">Runs</label>
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
            <label htmlFor="balls">Balls Faced</label>
            <input
              type="number"
              id="balls"
              name="balls"
              value={formData.balls}
              onChange={handleChange}
              min="0"
              required
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
            <label htmlFor="fours">Fours</label>
            <input
              type="number"
              id="fours"
              name="fours"
              value={formData.fours}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sixes">Sixes</label>
            <input
              type="number"
              id="sixes"
              name="sixes"
              value={formData.sixes}
              onChange={handleChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dismissalType">Dismissal Type</label>
            <select 
              id="dismissalType" 
              name="dismissalType" 
              value={formData.dismissalType}
              onChange={handleChange}
            >
              <option value="Not Out">Not Out</option>
              <option value="Bowled">Bowled</option>
              <option value="Caught">Caught</option>
              <option value="LBW">LBW</option>
              <option value="Run Out">Run Out</option>
              <option value="Stumped">Stumped</option>
              <option value="Hit Wicket">Hit Wicket</option>
              <option value="Retired Hurt">Retired Hurt</option>
            </select>
          </div>

          {formData.dismissalType !== 'Not Out' && formData.dismissalType !== 'Retired Hurt' && (
            <>
              <div className="form-group">
                <label htmlFor="bowler">Bowler</label>
                <input
                  type="text"
                  id="bowler"
                  name="bowler"
                  value={formData.bowler}
                  onChange={handleChange}
                  placeholder="Bowler name"
                />
              </div>

              {(formData.dismissalType === 'Caught' || formData.dismissalType === 'Stumped' || formData.dismissalType === 'Run Out') && (
                <div className="form-group">
                  <label htmlFor="fielder">Fielder</label>
                  <input
                    type="text"
                    id="fielder"
                    name="fielder"
                    value={formData.fielder}
                    onChange={handleChange}
                    placeholder="Fielder name"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {formData.runs > 0 && formData.balls > 0 && (
          <div className="calculated-stats">
            <div className="stat-display">
              <strong>Strike Rate:</strong> {calculateStrikeRate()}
            </div>
            {existingStats.length > 0 && (
              <div className="stat-display">
                <strong>Overall Average:</strong> {calculateAverage()}
              </div>
            )}
          </div>
        )}

        <button type="submit" className="submit-button">
          Add Batting Stats
        </button>
      </form>
    </div>
  )
}

export default BattingStats

