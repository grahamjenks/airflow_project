import { useState, useEffect } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { loadPlayers } from '../services/teamService'
import './MatchDetails.css'

const FORMAT_BY_MATCH_TYPE = {
  'Test':        { format: 'Test', overs: 90 },
  'First Class': { format: 'Test', overs: 90 },
  'ODI':         { format: 'ODI',  overs: 50 },
  'T20':         { format: 'T20',  overs: 20 },
}

const TODAY = new Date().toISOString().split('T')[0]

const ROLE_ABBR = { 'Wicket-keeper': 'WK', 'Bowler': 'B', 'All-rounder': 'AR', 'Batter': 'BAT' }

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
    team1XI: [],
    team2XI: [],
  })
  const [squadData, setSquadData] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!formData.team1Id) return
    loadPlayers(formData.team1Id).then(players =>
      setSquadData(prev => ({ ...prev, [formData.team1Id]: players }))
    )
  }, [formData.team1Id])

  useEffect(() => {
    if (!formData.team2Id) return
    loadPlayers(formData.team2Id).then(players =>
      setSquadData(prev => ({ ...prev, [formData.team2Id]: players }))
    )
  }, [formData.team2Id])

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
      [`${slot}XI`]: [],
    }))
  }

  const toggleXIPlayer = (slot, playerName) => {
    setFormData(prev => {
      const xi = prev[`${slot}XI`] || []
      return {
        ...prev,
        [`${slot}XI`]: xi.includes(playerName) ? xi.filter(n => n !== playerName) : [...xi, playerName],
      }
    })
  }

  const PlayingXI = ({ slot }) => {
    const teamId = formData[`${slot}Id`]
    const players = teamId ? (squadData[teamId] || []) : []
    if (!players.length) return null
    const xi = formData[`${slot}XI`] || []
    const xiSet = new Set(xi)
    const allNames = players.map(p => p.name)
    return (
      <div className="form-group form-group--xi">
        <div className="xi-header">
          <label>Playing XI <span className="xi-optional">(optional)</span></label>
          <span className="xi-count">{xi.length > 0 ? `${xi.length} selected` : 'Full squad'}</span>
        </div>
        <div className="xi-grid">
          {players.map(p => (
            <label key={p.name} className={`xi-player${xiSet.has(p.name) ? ' xi-player--on' : ''}`}>
              <input
                type="checkbox"
                checked={xiSet.has(p.name)}
                onChange={() => toggleXIPlayer(slot, p.name)}
              />
              <span className="xi-player__name">{p.name}</span>
              {p.role && <span className="xi-player__role">{ROLE_ABBR[p.role] || p.role[0]}</span>}
            </label>
          ))}
        </div>
        <div className="xi-actions">
          <button type="button" className="xi-btn" onClick={() => setFormData(prev => ({ ...prev, [`${slot}XI`]: allNames }))}>All</button>
          {xi.length > 0 && <button type="button" className="xi-btn xi-btn--clear" onClick={() => setFormData(prev => ({ ...prev, [`${slot}XI`]: [] }))}>Clear</button>}
        </div>
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const t1 = String(formData.team1 || '').trim()
    const t2 = String(formData.team2 || '').trim()
    if (t1 && t2 && t1.toLowerCase() === t2.toLowerCase()) {
      setError('Team 1 and Team 2 must be different.')
      return
    }
    setError(null)
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

        {error && (
          <div className="form-error" role="alert">{error}</div>
        )}

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

        {(squadData[formData.team1Id]?.length > 0 || squadData[formData.team2Id]?.length > 0) && (
          <div className="form-row">
            <PlayingXI slot="team1" />
            <PlayingXI slot="team2" />
          </div>
        )}

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

        <button type="submit" className="submit-button">
          Save Match Details
        </button>
      </form>
    </div>
  )
}

export default MatchDetails
