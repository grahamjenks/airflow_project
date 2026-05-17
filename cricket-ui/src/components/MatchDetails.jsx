import { useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import './MatchDetails.css'

const FORMAT_BY_MATCH_TYPE = {
  'Test':        { format: 'Test', overs: 90 },
  'First Class': { format: 'Test', overs: 90 },
  'ODI':         { format: 'ODI',  overs: 50 },
  'T20':         { format: 'T20',  overs: 20 },
}

const TODAY = new Date().toISOString().split('T')[0]

function MatchDetails({ onSubmit, matchData, teams = [], session }) {
  const [formData, setFormData] = useState(matchData || {
    noBallPenalty: 1,
    matchType: '',
    team1: '',
    team1Id: '',
    team2: '',
    team2Id: '',
    venue: '',
    date: TODAY,
    format: 'T20',
    overs: 20,
    tossWinner: '',
    tossDecision: '',
  })

  // If Supabase is active and the user is signed in but has no teams, block match creation
  if (isSupabaseConfigured() && session && teams.length === 0) {
    return (
      <div className="match-details">
        <h2>Match Information</h2>
        <div className="no-teams-prompt">
          <div className="no-teams-prompt__icon">🏏</div>
          <h3>Set up your teams first</h3>
          <p>You need at least two teams (with squads) before you can record a match.</p>
          <p>Go to the <strong>Teams</strong> tab to add teams and players.</p>
        </div>
      </div>
    )
  }

  const formatOptions = () => {
    switch (formData.matchType) {
      case 'Test':
      case 'First Class': return [{ value: 'Test', label: 'Test (Unlimited)' }]
      case 'ODI':         return [{ value: 'ODI',  label: 'ODI (50 overs)'  }]
      case 'T20':         return [{ value: 'T20',  label: 'T20 (20 overs)'  }]
      default: return [
        { value: 'T20',  label: 'T20 (20 overs)'  },
        { value: 'ODI',  label: 'ODI (50 overs)'  },
        { value: 'Test', label: 'Test (Unlimited)' },
      ]
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'matchType') {
      const mapped = FORMAT_BY_MATCH_TYPE[value]
      setFormData(prev => ({
        ...prev,
        matchType: value,
        ...(mapped ? { format: mapped.format, overs: mapped.overs } : {}),
      }))
      return
    }
    setFormData(prev => ({
      ...prev,
      [name]: value,
      overs: name === 'format' ? (value === 'T20' ? 20 : value === 'ODI' ? 50 : 90) : prev.overs,
    }))
  }

  const handleTeamSelect = (slot, teamId) => {
    const team = teams.find(t => t.id === teamId)
    setFormData(prev => ({
      ...prev,
      [slot]: team ? team.name : teamId,
      [`${slot}Id`]: team ? team.id : '',
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const hasTeams = teams.length > 0

  const TeamInput = ({ slot, label }) => {
    const nameField = slot
    const idField = `${slot}Id`

    if (hasTeams) {
      return (
        <div className="form-group">
          <label htmlFor={slot}>{label}</label>
          <select
            id={slot}
            name={slot}
            value={formData[idField] || ''}
            onChange={e => handleTeamSelect(slot, e.target.value)}
            required
          >
            <option value="">Select team…</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.shortName ? ` (${t.shortName})` : ''}</option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <div className="form-group">
        <label htmlFor={slot}>{label}</label>
        <input
          type="text"
          id={slot}
          name={nameField}
          value={formData[nameField]}
          onChange={handleChange}
          placeholder="Enter team name"
          required
        />
        <small className="form-hint">Add teams in the Teams tab to use dropdowns</small>
      </div>
    )
  }

  return (
    <div className="match-details">
      <h2>Match Information</h2>
      <form onSubmit={handleSubmit} className="match-form">

        <div className="form-group form-group--noball">
          <label>No-Ball Penalty</label>
          <div className="noball-options">
            {[1, 2].map(n => (
              <label key={n} className={`noball-option${formData.noBallPenalty === n ? ' noball-option--active' : ''}`}>
                <input
                  type="radio"
                  name="noBallPenalty"
                  value={n}
                  checked={formData.noBallPenalty === n}
                  onChange={() => setFormData(prev => ({ ...prev, noBallPenalty: n }))}
                />
                {n} run{n > 1 ? 's' : ''}
              </label>
            ))}
          </div>
          <small className="form-hint">Most formats: 1 run · Some leagues: 2 runs</small>
        </div>

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
              disabled={formData.matchType in FORMAT_BY_MATCH_TYPE}
              required
            >
              {formatOptions().map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <TeamInput slot="team1" label="Team 1" />
          <TeamInput slot="team2" label="Team 2" />
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
