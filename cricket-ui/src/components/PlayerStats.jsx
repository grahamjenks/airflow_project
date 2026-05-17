import { useState, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './PlayerStats.css'

function parseBalls(overs) {
  const [ov, rem] = String(overs || 0).split('.').map(Number)
  return ov * 6 + (rem || 0)
}

export default function PlayerStats() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('batting')
  const [teamFilter, setTeamFilter] = useState('all')

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Cloud storage not configured — sign in to view player stats.')
      setLoading(false)
      return
    }
    supabase
      .from('matches')
      .select('batting_stats, bowling_stats, match_data')
      .then(({ data, error: err }) => {
        if (err) throw err
        setMatches(data || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load matches.')
        setLoading(false)
      })
  }, [])

  const allTeams = useMemo(() => {
    const teams = new Set()
    for (const m of matches) {
      ;(m.batting_stats || []).forEach(s => s.team && teams.add(s.team))
      ;(m.bowling_stats || []).forEach(s => s.team && teams.add(s.team))
    }
    return [...teams].sort()
  }, [matches])

  const battingAgg = useMemo(() => {
    const map = {}
    for (const m of matches) {
      for (const s of (m.batting_stats || [])) {
        if (!s.playerName) continue
        const key = `${s.playerName}||${s.team}`
        if (!map[key]) {
          map[key] = { playerName: s.playerName, team: s.team, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0, notOuts: 0, hs: 0 }
        }
        const p = map[key]
        p.innings++
        p.runs += Number(s.runs) || 0
        p.balls += Number(s.balls) || 0
        p.fours += Number(s.fours) || 0
        p.sixes += Number(s.sixes) || 0
        if (s.dismissalType === 'Not Out' || s.dismissalType === 'Retired Hurt') p.notOuts++
        if ((Number(s.runs) || 0) > p.hs) p.hs = Number(s.runs)
      }
    }
    return Object.values(map).map(p => {
      const disms = p.innings - p.notOuts
      return {
        ...p,
        average: disms > 0 ? (p.runs / disms).toFixed(2) : (p.runs > 0 ? '∞' : '—'),
        strikeRate: p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '—',
      }
    }).sort((a, b) => b.runs - a.runs)
  }, [matches])

  const bowlingAgg = useMemo(() => {
    const map = {}
    for (const m of matches) {
      for (const s of (m.bowling_stats || [])) {
        if (!s.playerName) continue
        const key = `${s.playerName}||${s.team}`
        if (!map[key]) {
          map[key] = { playerName: s.playerName, team: s.team, innings: 0, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, bestW: 0, bestR: Infinity }
        }
        const p = map[key]
        p.innings++
        p.legalBalls += parseBalls(s.overs)
        p.runs += Number(s.runs) || 0
        p.wickets += Number(s.wickets) || 0
        p.maidens += Number(s.maidens) || 0
        const w = Number(s.wickets) || 0
        const r = Number(s.runs) || 0
        if (w > p.bestW || (w === p.bestW && r < p.bestR)) { p.bestW = w; p.bestR = r }
      }
    }
    return Object.values(map).map(p => {
      const ov = Math.floor(p.legalBalls / 6)
      const rem = p.legalBalls % 6
      return {
        ...p,
        overs: rem ? `${ov}.${rem}` : String(ov),
        economy: p.legalBalls > 0 ? (p.runs / (p.legalBalls / 6)).toFixed(2) : '—',
        average: p.wickets > 0 ? (p.runs / p.wickets).toFixed(2) : '—',
        best: p.bestW > 0 ? `${p.bestW}/${p.bestR === Infinity ? '?' : p.bestR}` : '—',
      }
    }).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
  }, [matches])

  const filteredBatting = teamFilter === 'all' ? battingAgg : battingAgg.filter(p => p.team === teamFilter)
  const filteredBowling = teamFilter === 'all' ? bowlingAgg : bowlingAgg.filter(p => p.team === teamFilter)

  if (loading) return <div className="ps-state">Loading player stats…</div>
  if (error) return <div className="ps-state ps-state--error">{error}</div>
  if (!matches.length) return <div className="ps-state">No matches saved yet.</div>

  return (
    <div className="ps-root">
      <div className="ps-page-header">
        <h2>Player Statistics — All Matches</h2>
        <span className="ps-match-count">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
      </div>

      <div className="ps-controls">
        <div className="ps-tabs">
          <button className={activeTab === 'batting' ? 'active' : ''} onClick={() => setActiveTab('batting')}>Batting</button>
          <button className={activeTab === 'bowling' ? 'active' : ''} onClick={() => setActiveTab('bowling')}>Bowling</button>
        </div>
        {allTeams.length > 0 && (
          <select className="ps-team-filter" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
            <option value="all">All Teams</option>
            {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {activeTab === 'batting' && (
        <div className="ps-table-wrap">
          {filteredBatting.length === 0
            ? <div className="ps-state">No batting data for this filter.</div>
            : (
              <table className="ps-table">
                <thead>
                  <tr>
                    <th>#</th><th>Player</th><th>Team</th><th>Inn</th>
                    <th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>4s</th><th>6s</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatting.map((p, i) => (
                    <tr key={i} className={i < 3 ? 'ps-row--top' : ''}>
                      <td className="ps-rank">{i + 1}</td>
                      <td className="ps-name">{p.playerName}</td>
                      <td className="ps-team">{p.team}</td>
                      <td>{p.innings}</td>
                      <td><strong>{p.runs}</strong></td>
                      <td>{p.hs}</td>
                      <td>{p.average}</td>
                      <td>{p.strikeRate}</td>
                      <td>{p.fours}</td>
                      <td>{p.sixes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {activeTab === 'bowling' && (
        <div className="ps-table-wrap">
          {filteredBowling.length === 0
            ? <div className="ps-state">No bowling data for this filter.</div>
            : (
              <table className="ps-table">
                <thead>
                  <tr>
                    <th>#</th><th>Player</th><th>Team</th><th>Inn</th>
                    <th>Wkts</th><th>Runs</th><th>Overs</th><th>Mdns</th><th>Econ</th><th>Avg</th><th>Best</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBowling.map((p, i) => (
                    <tr key={i} className={i < 3 ? 'ps-row--top' : ''}>
                      <td className="ps-rank">{i + 1}</td>
                      <td className="ps-name">{p.playerName}</td>
                      <td className="ps-team">{p.team}</td>
                      <td>{p.innings}</td>
                      <td><strong>{p.wickets}</strong></td>
                      <td>{p.runs}</td>
                      <td>{p.overs}</td>
                      <td>{p.maidens}</td>
                      <td>{p.economy}</td>
                      <td>{p.average}</td>
                      <td>{p.best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}
    </div>
  )
}
