import { useState, useEffect, useCallback } from 'react'
import { loadTeams, saveTeam, deleteTeam, loadPlayers, savePlayer, deletePlayer } from '../services/teamService'
import { isSupabaseConfigured } from '../lib/supabase'
import './TeamsView.css'

const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper']
const BATTING_STYLES = ['Right-hand bat', 'Left-hand bat']
const BOWLING_STYLES = [
  'Right-arm fast', 'Right-arm medium-fast', 'Right-arm medium',
  'Right-arm off-spin', 'Right-arm leg-spin',
  'Left-arm fast', 'Left-arm medium', 'Left-arm orthodox', 'Left-arm chinaman',
  'N/A',
]

const BLANK_TEAM = { name: '', shortName: '', homeGround: '' }
const BLANK_PLAYER = { name: '', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'N/A', jerseyNumber: '' }

function RoleBadge({ role }) {
  const cls = {
    'Batsman': 'role-bat',
    'Bowler': 'role-bowl',
    'All-rounder': 'role-all',
    'Wicket-keeper': 'role-wk',
  }[role] || ''
  return <span className={`role-badge ${cls}`}>{role}</span>
}

export default function TeamsView({ onTeamsChanged }) {
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [playersLoading, setPlayersLoading] = useState(false)

  // Team form
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamForm, setTeamForm] = useState(BLANK_TEAM)
  const [teamSaving, setTeamSaving] = useState(false)

  // Player form
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const [playerForm, setPlayerForm] = useState(BLANK_PLAYER)
  const [playerSaving, setPlayerSaving] = useState(false)

  const [error, setError] = useState(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    const data = await loadTeams()
    setTeams(data)
    setLoading(false)
    onTeamsChanged?.(data)
  }, [onTeamsChanged])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const fetchPlayers = useCallback(async (teamId) => {
    setPlayersLoading(true)
    const data = await loadPlayers(teamId)
    setPlayers(data)
    setPlayersLoading(false)
  }, [])

  const selectTeam = (team) => {
    setSelectedTeam(team)
    setShowPlayerForm(false)
    setPlayerForm(BLANK_PLAYER)
    fetchPlayers(team.id)
  }

  // ── Team CRUD ──────────────────────────────────────────────────────────────

  const handleSaveTeam = async (e) => {
    e.preventDefault()
    setError(null)
    setTeamSaving(true)
    try {
      const saved = await saveTeam(teamForm)
      await fetchTeams()
      setShowTeamForm(false)
      setTeamForm(BLANK_TEAM)
      if (!teamForm.id) selectTeam(saved)
    } catch (err) {
      setError(err.message || 'Failed to save team')
    } finally {
      setTeamSaving(false)
    }
  }

  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Delete "${team.name}" and all its players?`)) return
    try {
      await deleteTeam(team.id)
      if (selectedTeam?.id === team.id) { setSelectedTeam(null); setPlayers([]) }
      await fetchTeams()
    } catch (err) {
      setError(err.message || 'Failed to delete team')
    }
  }

  const handleEditTeam = (team) => {
    setTeamForm({ id: team.id, name: team.name, shortName: team.shortName, homeGround: team.homeGround })
    setShowTeamForm(true)
  }

  // ── Player CRUD ────────────────────────────────────────────────────────────

  const handleSavePlayer = async (e) => {
    e.preventDefault()
    if (!selectedTeam) return
    setError(null)
    setPlayerSaving(true)
    try {
      await savePlayer({ ...playerForm, teamId: selectedTeam.id })
      await fetchPlayers(selectedTeam.id)
      setShowPlayerForm(false)
      setPlayerForm(BLANK_PLAYER)
    } catch (err) {
      setError(err.message || 'Failed to save player')
    } finally {
      setPlayerSaving(false)
    }
  }

  const handleDeletePlayer = async (player) => {
    if (!window.confirm(`Remove ${player.name} from squad?`)) return
    try {
      await deletePlayer(player.id)
      setPlayers(prev => prev.filter(p => p.id !== player.id))
    } catch (err) {
      setError(err.message || 'Failed to delete player')
    }
  }

  const handleEditPlayer = (player) => {
    setPlayerForm({
      id: player.id, name: player.name, role: player.role,
      battingStyle: player.battingStyle, bowlingStyle: player.bowlingStyle,
      jerseyNumber: player.jerseyNumber,
    })
    setShowPlayerForm(true)
  }

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!isSupabaseConfigured()) {
    return (
      <div className="tv-empty-state">
        <div className="tv-empty-icon">☁️</div>
        <h3>Supabase required</h3>
        <p>Team management needs a Supabase connection. Sign in to enable it.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="tv-root">
      {error && (
        <div className="tv-error" onClick={() => setError(null)}>
          {error} <span className="tv-error-close">✕</span>
        </div>
      )}

      <div className="tv-layout">

        {/* ── Teams sidebar ── */}
        <aside className="tv-sidebar">
          <div className="tv-sidebar__header">
            <h3>Teams</h3>
            <button
              className="tv-icon-btn"
              onClick={() => { setTeamForm(BLANK_TEAM); setShowTeamForm(v => !v) }}
              title="Add team"
            >+</button>
          </div>

          {showTeamForm && (
            <form onSubmit={handleSaveTeam} className="tv-team-form">
              <input
                className="tv-input" type="text" placeholder="Team name *" required
                value={teamForm.name}
                onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))}
              />
              <input
                className="tv-input" type="text" placeholder="Short name (e.g. AUS)" maxLength={5}
                value={teamForm.shortName}
                onChange={e => setTeamForm(f => ({ ...f, shortName: e.target.value }))}
              />
              <input
                className="tv-input" type="text" placeholder="Home ground"
                value={teamForm.homeGround}
                onChange={e => setTeamForm(f => ({ ...f, homeGround: e.target.value }))}
              />
              <div className="tv-form-actions">
                <button type="submit" className="tv-btn tv-btn--primary" disabled={teamSaving}>
                  {teamSaving ? 'Saving…' : teamForm.id ? 'Update' : 'Add Team'}
                </button>
                <button type="button" className="tv-btn tv-btn--ghost"
                  onClick={() => { setShowTeamForm(false); setTeamForm(BLANK_TEAM) }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="tv-loading">Loading…</p>
          ) : teams.length === 0 ? (
            <p className="tv-hint">No teams yet — add one above.</p>
          ) : (
            <ul className="tv-team-list">
              {teams.map(team => (
                <li
                  key={team.id}
                  className={`tv-team-item ${selectedTeam?.id === team.id ? 'tv-team-item--active' : ''}`}
                  onClick={() => selectTeam(team)}
                >
                  <div className="tv-team-item__main">
                    <span className="tv-team-item__name">{team.name}</span>
                    {team.shortName && <span className="tv-team-item__short">{team.shortName}</span>}
                  </div>
                  <div className="tv-team-item__actions">
                    <button className="tv-row-btn" onClick={e => { e.stopPropagation(); handleEditTeam(team) }} title="Edit">✏️</button>
                    <button className="tv-row-btn tv-row-btn--del" onClick={e => { e.stopPropagation(); handleDeleteTeam(team) }} title="Delete">🗑</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── Team detail ── */}
        <section className="tv-detail">
          {!selectedTeam ? (
            <div className="tv-empty-state">
              <div className="tv-empty-icon">🏏</div>
              <p>Select a team to manage its squad</p>
            </div>
          ) : (
            <>
              <div className="tv-detail__header">
                <div>
                  <h2 className="tv-detail__name">{selectedTeam.name}</h2>
                  <div className="tv-detail__meta">
                    {selectedTeam.shortName && <span>{selectedTeam.shortName}</span>}
                    {selectedTeam.homeGround && <span>📍 {selectedTeam.homeGround}</span>}
                  </div>
                </div>
              </div>

              <div className="tv-squad-header">
                <h3>Squad <span className="tv-squad-count">({players.length})</span></h3>
                <button
                  className="tv-btn tv-btn--primary tv-btn--sm"
                  onClick={() => { setPlayerForm(BLANK_PLAYER); setShowPlayerForm(v => !v) }}
                >
                  {showPlayerForm ? 'Cancel' : '+ Add Player'}
                </button>
              </div>

              {showPlayerForm && (
                <form onSubmit={handleSavePlayer} className="tv-player-form">
                  <div className="tv-player-form__grid">
                    <div className="tv-field">
                      <label>Name *</label>
                      <input
                        className="tv-input" type="text" required placeholder="Full name"
                        value={playerForm.name}
                        onChange={e => setPlayerForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="tv-field">
                      <label>Role</label>
                      <select className="tv-input" value={playerForm.role}
                        onChange={e => setPlayerForm(f => ({ ...f, role: e.target.value }))}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="tv-field">
                      <label>Batting</label>
                      <select className="tv-input" value={playerForm.battingStyle}
                        onChange={e => setPlayerForm(f => ({ ...f, battingStyle: e.target.value }))}>
                        {BATTING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="tv-field">
                      <label>Bowling</label>
                      <select className="tv-input" value={playerForm.bowlingStyle}
                        onChange={e => setPlayerForm(f => ({ ...f, bowlingStyle: e.target.value }))}>
                        {BOWLING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="tv-field tv-field--narrow">
                      <label>#</label>
                      <input
                        className="tv-input" type="number" placeholder="Jersey" min={1} max={99}
                        value={playerForm.jerseyNumber}
                        onChange={e => setPlayerForm(f => ({ ...f, jerseyNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="tv-form-actions">
                    <button type="submit" className="tv-btn tv-btn--primary" disabled={playerSaving}>
                      {playerSaving ? 'Saving…' : playerForm.id ? 'Update Player' : 'Add to Squad'}
                    </button>
                    <button type="button" className="tv-btn tv-btn--ghost"
                      onClick={() => { setShowPlayerForm(false); setPlayerForm(BLANK_PLAYER) }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {playersLoading ? (
                <p className="tv-loading">Loading squad…</p>
              ) : players.length === 0 ? (
                <p className="tv-hint">No players yet — add some above.</p>
              ) : (
                <div className="tv-squad-table-wrap">
                  <table className="tv-squad-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Batting</th>
                        <th>Bowling</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map(player => (
                        <tr key={player.id}>
                          <td className="tv-jersey">{player.jerseyNumber || '—'}</td>
                          <td className="tv-player-name">{player.name}</td>
                          <td><RoleBadge role={player.role} /></td>
                          <td className="tv-style">{player.battingStyle}</td>
                          <td className="tv-style">{player.bowlingStyle !== 'N/A' ? player.bowlingStyle : '—'}</td>
                          <td className="tv-row-actions">
                            <button className="tv-row-btn" onClick={() => handleEditPlayer(player)} title="Edit">✏️</button>
                            <button className="tv-row-btn tv-row-btn--del" onClick={() => handleDeletePlayer(player)} title="Remove">🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
