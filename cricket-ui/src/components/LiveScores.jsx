import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import './LiveScores.css'

const INNINGS_COLORS = ['#667eea', '#e53e3e', '#38a169', '#d69e2e']
const ORDINAL = ['1st', '2nd', '3rd', '4th']
const LIVE_PHASES = new Set(['setup', 'scoring', 'inningsBreak'])
const POLL_MS = 15_000

// ─── Data helpers ─────────────────────────────────────────────────────────────

function score(deliveries, innings) {
  const inns = (deliveries || []).filter(d => d.innings === innings)
  const runs = inns.reduce((s, d) => s + d.batRuns + d.extraRuns, 0)
  const wickets = inns.filter(d => d.wicket).length
  const legal = inns.filter(d => d.isLegalDelivery).length
  return { runs, wickets, overs: Math.floor(legal / 6), balls: legal % 6, legal }
}

function battingTeam(deliveries, innings) {
  return (deliveries || []).find(d => d.innings === innings)?.battingTeam || ''
}

function target(deliveries, currentInnings, currentBatting) {
  if (currentInnings < 2) return null
  let opp = 0, own = 0
  for (let n = 1; n < currentInnings; n++) {
    const s = score(deliveries, n)
    battingTeam(deliveries, n) === currentBatting ? (own += s.runs) : (opp += s.runs)
  }
  return opp - own + 1
}

// Build worm data: one point per completed over per innings, starting at 0
function buildWorm(deliveries) {
  if (!deliveries?.length) return { rows: [], inningsNums: [] }
  const inningsNums = [...new Set(deliveries.map(d => d.innings))].sort()

  // Collect all "over completion" points across all innings
  const points = new Set([0])
  for (const n of inningsNums) {
    const overNums = [...new Set(deliveries.filter(d => d.innings === n).map(d => d.overNum))]
    for (const ov of overNums) points.add(ov + 1)
  }

  const rows = [...points].sort((a, b) => a - b).map(pt => {
    const row = { over: pt }
    for (const n of inningsNums) {
      row[`i${n}`] = deliveries
        .filter(d => d.innings === n && d.overNum < pt)
        .reduce((s, d) => s + d.batRuns + d.extraRuns, 0)
    }
    return row
  })

  return { rows, inningsNums }
}

// ─── Scorecard derivation ─────────────────────────────────────────────────────

function buildScorecard(deliveries, innings) {
  const batOrder = []
  const batters = {}
  const bowlers = {}
  const overMap = {}

  for (const d of (deliveries || [])) {
    if (d.innings !== innings) continue

    if (d.isRetirement) {
      if (d.retiredBatter && batters[d.retiredBatter]) {
        batters[d.retiredBatter].dismissal = d.retirementType === 'Hurt' ? 'Retired Hurt' : 'Retired Out'
      }
      continue
    }

    if (d.striker) {
      if (!batters[d.striker]) { batOrder.push(d.striker); batters[d.striker] = { name: d.striker, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out', bowler: '', fielder: '' } }
      const b = batters[d.striker]
      if (d.extraType !== 'bye' && d.extraType !== 'legbye') b.runs += d.batRuns
      if (d.batRuns === 4 && !d.extraType) b.fours++
      if (d.batRuns === 6 && !d.extraType) b.sixes++
      if (d.extraType !== 'wide') b.balls++
      if (d.wicket?.outBatsman === d.striker) { b.dismissal = d.wicket.type; b.bowler = d.bowler || ''; b.fielder = d.wicket.fielder || '' }
    }

    if (d.nonStriker && !batters[d.nonStriker]) { batOrder.push(d.nonStriker); batters[d.nonStriker] = { name: d.nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out', bowler: '', fielder: '' } }

    if (d.wicket?.outBatsman && d.wicket.outBatsman !== d.striker && batters[d.wicket.outBatsman]) {
      const nb = batters[d.wicket.outBatsman]
      nb.dismissal = d.wicket.type; nb.bowler = d.bowler || ''; nb.fielder = d.wicket.fielder || ''
    }

    if (d.bowler) {
      if (!bowlers[d.bowler]) bowlers[d.bowler] = { name: d.bowler, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 }
      const bwl = bowlers[d.bowler]
      const charged = (d.extraType === 'bye' || d.extraType === 'legbye') ? 0 : d.batRuns + d.extraRuns
      if (d.isLegalDelivery) bwl.legalBalls++
      bwl.runs += charged
      if (d.extraType === 'wide') bwl.wides++
      if (d.extraType === 'noball') bwl.noBalls++
      if (d.wicket && d.wicket.type !== 'Run Out' && d.wicket.type !== 'Retired Hurt') bwl.wickets++
      const ok = `${d.bowler}:${d.overNum}`
      if (!overMap[ok]) overMap[ok] = { bowler: d.bowler, balls: 0, runs: 0 }
      if (d.isLegalDelivery) overMap[ok].balls++
      overMap[ok].runs += charged
    }
  }

  for (const ov of Object.values(overMap)) {
    if (ov.balls === 6 && ov.runs === 0 && bowlers[ov.bowler]) bowlers[ov.bowler].maidens++
  }

  return { batters: batOrder.map(n => batters[n]), bowlers: Object.values(bowlers) }
}

function formatOvers(legalBalls) {
  const ov = Math.floor(legalBalls / 6); const rem = legalBalls % 6
  return rem ? `${ov}.${rem}` : String(ov)
}

function formatDismissal(b) {
  if (b.dismissal === 'not out') return 'not out'
  if (b.dismissal === 'Bowled') return `b ${b.bowler}`
  if (b.dismissal === 'LBW') return `lbw b ${b.bowler}`
  if (b.dismissal === 'Caught') return `c ${b.fielder ? b.fielder + ' ' : ''}b ${b.bowler}`.trim()
  if (b.dismissal === 'Stumped') return `st ${b.fielder ? b.fielder + ' ' : ''}b ${b.bowler}`.trim()
  if (b.dismissal === 'Hit Wicket') return `hit wkt b ${b.bowler}`
  if (b.dismissal === 'Run Out') return `run out${b.fielder ? ` (${b.fielder})` : ''}`
  if (b.dismissal === 'Retired Hurt') return 'ret hurt'
  if (b.dismissal === 'Retired Out') return 'ret out'
  return b.dismissal
}

// ─── Scorecard per innings ────────────────────────────────────────────────────

function ScorecardInnings({ deliveries, innings, sc }) {
  const { batters, bowlers } = buildScorecard(deliveries, innings)
  if (!batters.length && !bowlers.length) return null
  const bTeam = battingTeam(deliveries, innings)
  const isCurrent = sc.innings === innings

  return (
    <div className="lsc-sc-innings">
      <div className="lsc-sc-header">
        <span className="lsc-sc-team">{bTeam}</span>
        <span className="lsc-sc-label">{ORDINAL[innings - 1]} Innings</span>
      </div>

      {batters.length > 0 && (
        <table className="lsc-sc-table">
          <thead>
            <tr>
              <th className="lsc-sc-th--name">Batter</th>
              <th className="lsc-sc-th--how"></th>
              <th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
            </tr>
          </thead>
          <tbody>
            {batters.map(b => (
              <tr key={b.name} className={isCurrent && (b.name === sc.striker || b.name === sc.nonStriker) ? 'lsc-sc-tr--live' : ''}>
                <td className="lsc-sc-td--name">
                  {b.name}{isCurrent && b.name === sc.striker && <span className="lsc-sc-star"> ★</span>}
                </td>
                <td className="lsc-sc-td--how">{formatDismissal(b)}</td>
                <td><strong>{b.runs}</strong></td>
                <td className="lsc-sc-muted">{b.balls}</td>
                <td className="lsc-sc-muted">{b.fours}</td>
                <td className="lsc-sc-muted">{b.sixes}</td>
                <td className="lsc-sc-muted">{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {bowlers.length > 0 && (
        <table className="lsc-sc-table lsc-sc-table--bowling">
          <thead>
            <tr>
              <th className="lsc-sc-th--name">Bowler</th>
              <th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
            </tr>
          </thead>
          <tbody>
            {bowlers.map(b => (
              <tr key={b.name} className={isCurrent && b.name === sc.currentBowler ? 'lsc-sc-tr--live' : ''}>
                <td className="lsc-sc-td--name">
                  {b.name}{isCurrent && b.name === sc.currentBowler && <span className="lsc-sc-star"> ★</span>}
                </td>
                <td>{formatOvers(b.legalBalls)}</td>
                <td className="lsc-sc-muted">{b.maidens}</td>
                <td>{b.runs}</td>
                <td><strong>{b.wickets}</strong></td>
                <td className="lsc-sc-muted">{b.legalBalls > 0 ? (b.runs / (b.legalBalls / 6)).toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Worm chart ───────────────────────────────────────────────────────────────

function WormChart({ deliveries, matchOvers }) {
  const { rows, inningsNums } = buildWorm(deliveries)
  if (rows.length < 2) {
    return <div className="lsc-worm-empty">Worm will appear once overs begin</div>
  }

  const targetScore = inningsNums.length >= 2
    ? target(deliveries, Math.max(...inningsNums), battingTeam(deliveries, Math.max(...inningsNums)))
    : null

  const maxX = matchOvers || Math.max(...rows.map(r => r.over), 20)

  return (
    <div className="lsc-worm">
      <div className="lsc-worm__title">The Worm</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
          <XAxis
            dataKey="over"
            type="number"
            domain={[0, maxX]}
            tickCount={Math.min(maxX + 1, 11)}
            tick={{ fontSize: 11 }}
            label={{ value: 'Overs', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#a0aec0' }}
          />
          <YAxis tick={{ fontSize: 11 }} width={32} />
          <Tooltip
            labelFormatter={l => `After ${l} over${l !== 1 ? 's' : ''}`}
            formatter={(val, name) => [`${val}`, name]}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          {targetScore !== null && targetScore > 0 && (
            <ReferenceLine
              y={targetScore - 1}
              stroke="#e53e3e"
              strokeDasharray="6 3"
              label={{ value: `Target ${targetScore}`, position: 'right', fontSize: 11, fill: '#e53e3e' }}
            />
          )}
          {inningsNums.map((n, i) => (
            <Line
              key={n}
              type="monotone"
              dataKey={`i${n}`}
              name={`${battingTeam(deliveries, n)} (${ORDINAL[n - 1]})`}
              stroke={INNINGS_COLORS[i % INNINGS_COLORS.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Single match card ────────────────────────────────────────────────────────

function MatchCard({ match }) {
  const md = match.match_data || {}
  const deliveries = match.deliveries || []
  const sc = match.scorecard_state || {}
  const isLive = LIVE_PHASES.has(sc.phase)

  const inningsNums = [...new Set(deliveries.map(d => d.innings))].sort()
  const scores = inningsNums.map(n => ({ n, team: battingTeam(deliveries, n), ...score(deliveries, n) }))

  const tgt = sc.innings >= 2 && sc.battingTeam
    ? target(deliveries, sc.innings, sc.battingTeam)
    : null
  const currentScore = sc.innings ? score(deliveries, sc.innings) : null
  const needed = tgt !== null && tgt > 0 && currentScore ? tgt - currentScore.runs : null

  const formatDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
  const updatedAgo = () => {
    const secs = Math.round((Date.now() - new Date(match.updated_at)) / 1000)
    if (secs < 60) return `${secs}s ago`
    if (secs < 3600) return `${Math.round(secs / 60)}m ago`
    return `${Math.round(secs / 3600)}h ago`
  }

  return (
    <div className={`lsc-card${isLive ? ' lsc-card--live' : ''}`}>
      <div className="lsc-card__header">
        <div className="lsc-card__title">
          <span className="lsc-card__team">{md.team1}</span>
          <span className="lsc-card__vs">vs</span>
          <span className="lsc-card__team">{md.team2}</span>
        </div>
        <div className="lsc-card__badges">
          {isLive && sc.phase === 'scoring' && <span className="lsc-badge lsc-badge--live">● LIVE</span>}
          {isLive && sc.phase === 'inningsBreak' && <span className="lsc-badge lsc-badge--break">Innings Break</span>}
          {isLive && sc.phase === 'setup' && <span className="lsc-badge lsc-badge--break">Starting Soon</span>}
          {md.matchType && <span className="lsc-badge lsc-badge--type">{md.matchType}</span>}
        </div>
      </div>

      <div className="lsc-card__sub">
        {md.venue && <span>{md.venue}</span>}
        {md.date && <span>{formatDate(md.date)}</span>}
        <span className="lsc-card__ago">{updatedAgo()}</span>
      </div>

      {/* Innings scores */}
      <div className="lsc-scores">
        {scores.map(({ n, team, runs, wickets, overs, balls }) => (
          <div key={n} className={`lsc-score${sc.innings === n && isLive ? ' lsc-score--batting' : ''}`}>
            <span className="lsc-score__team">{team}</span>
            <span className="lsc-score__runs">{runs}<span className="lsc-score__wkts">/{wickets}</span></span>
            <span className="lsc-score__overs">({overs}.{balls} ov)</span>
            {sc.innings === n && isLive && <span className="lsc-score__inning-label">{ORDINAL[n - 1]} inn</span>}
          </div>
        ))}
      </div>

      {/* Target strip */}
      {needed !== null && needed > 0 && sc.phase === 'scoring' && (
        <div className="lsc-target">
          {sc.battingTeam} need <strong>{needed}</strong> more · target {tgt}
        </div>
      )}
      {tgt !== null && tgt <= 0 && (
        <div className="lsc-target lsc-target--won">
          {sc.battingTeam} have won!
        </div>
      )}

      {/* Live batsmen / bowler */}
      {sc.phase === 'scoring' && sc.striker && (
        <div className="lsc-batting">
          <span className="lsc-batting__batter">{sc.striker} <span className="lsc-batting__star">★</span></span>
          {sc.nonStriker && <span className="lsc-batting__batter lsc-batting__batter--ns">{sc.nonStriker}</span>}
          {sc.currentBowler && (
            <span className="lsc-batting__bowler">bowling: {sc.currentBowler}</span>
          )}
        </div>
      )}

      {/* Worm */}
      <WormChart deliveries={deliveries} matchOvers={md.overs} />
    </div>
  )
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function LiveScores() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Cloud storage not configured.')
      setLoading(false)
      return
    }
    try {
      const { data, error: err } = await supabase
        .from('matches')
        .select('id, match_data, deliveries, scorecard_state, updated_at')
        .order('updated_at', { ascending: false })
        .limit(30)
      if (err) throw err
      setMatches((data || []).filter(m => LIVE_PHASES.has(m.scorecard_state?.phase)))
      setLastUpdated(new Date())
      setError(null)
    } catch {
      setError('Unable to load — enable public read access in Supabase (see setup instructions).')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const t = setInterval(fetch, POLL_MS)
    return () => clearInterval(t)
  }, [fetch])

  return (
    <div className="lsc-root">
      <div className="lsc-page-header">
        <h2>Live Scores</h2>
        <div className="lsc-page-header__right">
          {lastUpdated && (
            <span className="lsc-updated">Refreshes every 15s · last {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button className="lsc-refresh" onClick={fetch} title="Refresh now">↻</button>
        </div>
      </div>

      {loading && <div className="lsc-state">Loading…</div>}

      {error && (
        <div className="lsc-state lsc-state--error">
          <p>{error}</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            In Supabase → SQL Editor, run:<br />
            <code>CREATE POLICY "public_read_matches" ON matches FOR SELECT USING (true);</code>
          </p>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="lsc-state">No matches currently in progress.</div>
      )}

      <div className="lsc-list">
        {matches.map(m => <MatchCard key={m.id} match={m} />)}
      </div>
    </div>
  )
}
