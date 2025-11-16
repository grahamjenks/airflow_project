import { useState } from 'react'
import './MatchDetails.css'

function MatchDetails({ onSubmit, matchData }) {
  const [formData, setFormData] = useState(matchData || {
    matchType: '',
    team1: '',
    team2: '',
    venue: '',
    date: '',
    format: 'T20',
    overs: 20,
    tossWinner: '',
    tossDecision: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      overs: name === 'format' ? (value === 'T20' ? 20 : value === 'ODI' ? 50 : 90) : prev.overs
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="match-details">
      <h2>Match Information</h2>
      <form onSubmit={handleSubmit} className="match-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="matchType">Match Type</label>
            <select 
              id="matchType" 
              name="matchType" 
              value={formData.matchType}
              onChange={handleChange}
              required
            >
              <option value="">Select match type</option>
              <option value="Test">Test Match</option>
              <option value="ODI">ODI</option>
              <option value="T20">T20</option>
              <option value="First Class">First Class</option>
              <option value="Club">Club Match</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="format">Format</label>
            <select 
              id="format" 
              name="format" 
              value={formData.format}
              onChange={handleChange}
              required
            >
              <option value="T20">T20 (20 overs)</option>
              <option value="ODI">ODI (50 overs)</option>
              <option value="Test">Test (Unlimited)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="team1">Team 1</label>
            <input
              type="text"
              id="team1"
              name="team1"
              value={formData.team1}
              onChange={handleChange}
              placeholder="Enter team name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="team2">Team 2</label>
            <input
              type="text"
              id="team2"
              name="team2"
              value={formData.team2}
              onChange={handleChange}
              placeholder="Enter team name"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="venue">Venue</label>
            <input
              type="text"
              id="venue"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="Enter venue"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="tossWinner">Toss Winner</label>
            <select 
              id="tossWinner" 
              name="tossWinner" 
              value={formData.tossWinner}
              onChange={handleChange}
            >
              <option value="">Select team</option>
              <option value={formData.team1}>{formData.team1 || 'Team 1'}</option>
              <option value={formData.team2}>{formData.team2 || 'Team 2'}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tossDecision">Toss Decision</label>
            <select 
              id="tossDecision" 
              name="tossDecision" 
              value={formData.tossDecision}
              onChange={handleChange}
            >
              <option value="">Select decision</option>
              <option value="Bat">Bat</option>
              <option value="Bowl">Bowl</option>
            </select>
          </div>
        </div>

        <button type="submit" className="submit-button">
          Save Match Details
        </button>
      </form>
    </div>
  )
}

export default MatchDetails

