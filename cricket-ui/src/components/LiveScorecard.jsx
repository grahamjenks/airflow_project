import { useState, useMemo, useEffect, useRef } from 'react'
import './LiveScorecard.css'

const DISMISSAL_TYPES = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Retired Hurt', 'Obstructing the Field', 'Hit the Ball Twice', 'Timed Out']
const NON_BOWLER_WICKETS = new Set(['Run Out', 'Retired Hurt', 'Obstructing the Field', 'Hit the Ball Twice', 'Timed Out'])

const ordinal = n => ['1st', '2nd', '3rd', '4th'][n - 1] || `${n}th`

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
  if (b.dismissal === 'Obstructing the Field') return 'obstruct field'
  if (b.dismissal === 'Hit the Ball Twice') return 'hit ball twice'
  if (b.dismissal === 'Timed Out') return 'timed out'
  return b.dismissal
}

function buildScorecardData(deliveries, inningsNum) {
  const batOrder = []; const batters = {}
  const bowlerOrder = []; const bowlers = {}
  const overMap = {}
  for (const d of deliveries) {
    if (d.innings !== inningsNum) continue
    if (d.isRetirement) {
      if (d.retiredBatter && batters[d.retiredBatter])
        batters[d.retiredBatter].dismissal = d.retirementType === 'Out' ? 'Retired Out' : 'Retired Hurt'
      continue
    }
    if (d.extraType === 'penalty') continue
    for (const name of [d.striker, d.nonStriker]) {
      if (name && !batters[name]) {
        batOrder.push(name)
        batters[name] = { name, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out', bowler: '', fielder: '' }
      }
    }
    if (d.striker) {
      const b = batters[d.striker]
      if (d.extraType !== 'bye' && d.extraType !== 'legbye') b.runs += d.batRuns
      if (d.batRuns === 4 && !d.extraType) b.fours++
      if (d.batRuns === 6 && !d.extraType) b.sixes++
      if (d.extraType !== 'wide') b.balls++
      if (d.wicket?.outBatsman === d.striker) { b.dismissal = d.wicket.type; b.bowler = d.bowler || ''; b.fielder = d.wicket.fielder || '' }
    }
    if (d.wicket?.outBatsman && d.wicket.outBatsman !== d.striker && batters[d.wicket.outBatsman]) {
      const b = batters[d.wicket.outBatsman]
      b.dismissal = d.wicket.type; b.bowler = d.bowler || ''; b.fielder = d.wicket.fielder || ''
    }
    if (d.bowler) {
      if (!bowlers[d.bowler]) { bowlerOrder.push(d.bowler); bowlers[d.bowler] = { name: d.bowler, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 } }
      const bwl = bowlers[d.bowler]
      const charged = d.extraType === 'bye' || d.extraType === 'legbye' ? 0 : d.batRuns + d.extraRuns
      if (d.isLegalDelivery) bwl.legalBalls++
      bwl.runs += charged
      if (d.extraType === 'wide') bwl.wides++
      if (d.extraType === 'noball') bwl.noBalls++
      if (d.wicket && !NON_BOWLER_WICKETS.has(d.wicket.type)) bwl.wickets++
      const ok = `${d.bowler}:${d.overNum}`
      if (!overMap[ok]) overMap[ok] = { bowler: d.bowler, balls: 0, runs: 0 }
      if (d.isLegalDelivery) overMap[ok].balls++
      overMap[ok].runs += charged
    }
  }
  for (const ov of Object.values(overMap)) {
    if (ov.balls === 6 && ov.runs === 0 && bowlers[ov.bowler]) bowlers[ov.bowler].maidens++
  }
  return { batters: batOrder.map(n => batters[n]), bowlers: bowlerOrder.map(n => bowlers[n]) }
}

function defaultBattingTeam(matchData) {
  const { team1, team2, tossWinner, tossDecision } = matchData || {}
  if (!tossWinner || !tossDecision || !team1 || !team2) return team1 || ''
  if (tossDecision === 'Bat') return tossWinner
  return tossWinner === team1 ? team2 : team1
}

// ─── Pure stat derivations ────────────────────────────────────────────────────

function computeScore(deliveries, innings) {
  const inns = deliveries.filter(d => d.innings === innings && !d.isRetirement)
  const runs = inns.reduce((s, d) => s + d.batRuns + d.extraRuns, 0)
  const wickets = inns.filter(d => d.wicket).length
  const legalBalls = inns.filter(d => d.isLegalDelivery).length
  return { runs, wickets, overs: Math.floor(legalBalls / 6), balls: legalBalls % 6, legalBalls }
}

function getBatsmanStats(deliveries, innings, name) {
  const faced = deliveries.filter(
    d => !d.isRetirement && d.innings === innings && d.striker === name && d.extraType !== 'wide'
  )
  const runs = faced.reduce(
    (s, d) => (d.extraType === 'bye' || d.extraType === 'legbye' ? s : s + d.batRuns), 0
  )
  return {
    runs, balls: faced.length,
    fours: faced.filter(d => d.batRuns === 4 && !d.extraType).length,
    sixes: faced.filter(d => d.batRuns === 6 && !d.extraType).length,
  }
}

function getBowlerFigures(deliveries, innings, name) {
  const mine = deliveries.filter(d => !d.isRetirement && d.innings === innings && d.bowler === name)
  const legalBalls = mine.filter(d => d.isLegalDelivery).length
  const runs = mine.reduce(
    (s, d) => (d.extraType === 'bye' || d.extraType === 'legbye' || d.extraType === 'penalty' ? s : s + d.batRuns + d.extraRuns), 0
  )
  const wickets = mine.filter(d => d.wicket && !NON_BOWLER_WICKETS.has(d.wicket.type)).length
  const overs = Math.floor(legalBalls / 6)
  const rem = legalBalls % 6
  return {
    overs: rem ? `${overs}.${rem}` : String(overs), runs, wickets,
    wides: mine.filter(d => d.extraType === 'wide').length,
    noBalls: mine.filter(d => d.extraType === 'noball').length,
  }
}

// Exclude retirement events from over-ball display
function getOverBalls(deliveries, innings, overNum) {
  return deliveries.filter(d => !d.isRetirement && d.innings === innings && d.overNum === overNum)
}

function inningsBattingTeam(deliveries, n) {
  return deliveries.find(d => d.innings === n)?.battingTeam || ''
}

function computeTarget(deliveries, currentInnings, currentBattingTeam) {
  if (currentInnings < 2) return null
  let opposing = 0, own = 0
  for (let n = 1; n < currentInnings; n++) {
    const s = computeScore(deliveries, n)
    const bt = inningsBattingTeam(deliveries, n)
    if (bt === currentBattingTeam) own += s.runs
    else opposing += s.runs
  }
  return opposing - own + 1
}

// ─── Partnership / over-limit helpers ────────────────────────────────────────

function computeCurrentPartnership(deliveries, innings) {
  const inningsDels = deliveries.filter(d => d.innings === innings)
  let start = 0
  for (let i = inningsDels.length - 1; i >= 0; i--) {
    if (inningsDels[i].wicket || inningsDels[i].isRetirement) { start = i + 1; break }
  }
  const dels = inningsDels.slice(start).filter(d => !d.isRetirement)
  return {
    runs: dels.reduce((s, d) => s + d.batRuns + d.extraRuns, 0),
    balls: dels.filter(d => d.isLegalDelivery).length,
  }
}

function getOversPerBowler(deliveries, innings) {
  const map = {}
  for (const d of deliveries) {
    if (d.innings !== innings || d.isRetirement || !d.bowler) continue
    if (d.isLegalDelivery) map[d.bowler] = (map[d.bowler] || 0) + 1
  }
  return map
}

// ─── Ball icon ────────────────────────────────────────────────────────────────

function Ball({ d }) {
  if (!d) return <span className="sc-ball sc-ball--empty" />
  if (d.wicket) return <span className="sc-ball sc-ball--wicket">W</span>
  if (d.extraType === 'wide') return <span className="sc-ball sc-ball--extra">Wd</span>
  if (d.extraType === 'noball') return <span className="sc-ball sc-ball--extra">nb</span>
  if (d.extraType === 'bye') return <span className="sc-ball sc-ball--extra">{d.extraRuns}b</span>
  if (d.extraType === 'legbye') return <span className="sc-ball sc-ball--extra">{d.extraRuns}lb</span>
  if (d.extraType === 'penalty') return <span className="sc-ball sc-ball--penalty" title={`Penalty to ${d.penaltyTo || 'batting'} team`}>P5</span>
  if (d.batRuns === 0) return <span className="sc-ball sc-ball--dot">·</span>
  if (d.batRuns === 4) return <span className="sc-ball sc-ball--four">4</span>
  if (d.batRuns === 6) return <span className="sc-ball sc-ball--six">6</span>
  return <span className="sc-ball">{d.batRuns}</span>
}

// ─── Dropdown or text fallback for player selection ───────────────────────────

// groups = [{ label, names }] enables <optgroup> layout; falls back to flat list when absent
function PlayerPicker({ names = [], value, onChange, placeholder, className, pinnedNames = [], disabledNames = [], groups = null }) {
  const namesKey = names.join('\x01')
  const [manual, setManual] = useState(false)
  useEffect(() => { setManual(false) }, [namesKey])

  const disabledSet = new Set(disabledNames)
  const hasOptions = groups ? groups.some(g => g.names.length > 0) : names.length > 0

  if (!hasOptions || manual) {
    return (
      <input
        type="text"
        className={className || 'sc-prompt__input'}
        value={value}
        placeholder={placeholder}
        autoFocus
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  const pinnedSet = new Set(pinnedNames)

  return (
    <select
      className={className || 'sc-prompt__select'}
      value={value}
      onChange={e => {
        if (e.target.value === '__manual__') { setManual(true); onChange('') }
        else onChange(e.target.value)
      }}
    >
      <option value="">{placeholder || 'Select…'}</option>
      {groups ? (
        groups.filter(g => g.names.length > 0).map(g => (
          <optgroup key={g.label} label={g.label}>
            {g.names.map(n => (
              <option key={n} value={n} disabled={disabledSet.has(n)}>
                {n}{disabledSet.has(n) ? ' — cannot bowl consecutive overs' : ''}
              </option>
            ))}
          </optgroup>
        ))
      ) : (
        <>
          {pinnedNames.length > 0 && (
            <optgroup label="Recent">
              {pinnedNames.map(n => (
                <option key={`pin-${n}`} value={n} disabled={disabledSet.has(n)}>
                  {n}{disabledSet.has(n) ? ' — cannot bowl consecutive overs' : ''}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={pinnedNames.length > 0 ? 'All bowlers' : 'Squad'}>
            {names.filter(n => !pinnedSet.has(n)).map(n => (
              <option key={n} value={n} disabled={disabledSet.has(n)}>
                {n}
              </option>
            ))}
          </optgroup>
        </>
      )}
      <optgroup label="Not in squad?">
        <option value="__manual__">Enter name manually…</option>
      </optgroup>
    </select>
  )
}

// ─── Expandable full scorecard ────────────────────────────────────────────────

function FullScorecard({ deliveries, currentInnings, currentStriker, currentBowler, show, onToggle }) {
  const playedInnings = [1, 2, 3, 4].filter(n =>
    deliveries.some(d => d.innings === n && !d.isRetirement)
  )
  if (!playedInnings.length) return null

  return (
    <div className="sc-fullcard">
      <button className="sc-fullcard__toggle" onClick={onToggle}>
        {show ? '▲ Hide Scorecard' : '▼ Full Scorecard'}
      </button>
      {show && (
        <div className="sc-fullcard__body">
          {playedInnings.map(n => {
            const { batters, bowlers } = buildScorecardData(deliveries, n)
            const bTeam = inningsBattingTeam(deliveries, n)
            const s = computeScore(deliveries, n)
            const isLive = n === currentInnings
            return (
              <div key={n} className="sc-fullcard__innings">
                <div className="sc-fullcard__inn-header">
                  <span className="sc-fullcard__inn-team">{bTeam}</span>
                  <span className="sc-fullcard__inn-score">{s.runs}/{s.wickets}</span>
                  <span className="sc-fullcard__inn-label">{ordinal(n)} Inn · {s.overs}.{s.balls} ov</span>
                </div>

                {batters.length > 0 && (
                  <table className="sc-fullcard__table">
                    <thead>
                      <tr>
                        <th className="sc-fullcard__th--name">Batter</th>
                        <th className="sc-fullcard__th--how"></th>
                        <th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batters.map(b => (
                        <tr key={b.name} className={isLive && (b.name === currentStriker || b.name === nonStrikerInInnings(deliveries, n, currentStriker)) ? 'sc-fullcard__row--live' : ''}>
                          <td className="sc-fullcard__td--name">
                            {b.name}{isLive && b.name === currentStriker && <span className="sc-fullcard__dot"> ●</span>}
                          </td>
                          <td className="sc-fullcard__td--how">{formatDismissal(b)}</td>
                          <td><strong>{b.runs}</strong></td>
                          <td className="sc-fullcard__muted">{b.balls}</td>
                          <td className="sc-fullcard__muted">{b.fours}</td>
                          <td className="sc-fullcard__muted">{b.sixes}</td>
                          <td className="sc-fullcard__muted">{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {bowlers.length > 0 && (
                  <table className="sc-fullcard__table sc-fullcard__table--bowl">
                    <thead>
                      <tr>
                        <th className="sc-fullcard__th--name">Bowler</th>
                        <th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlers.map(b => (
                        <tr key={b.name} className={isLive && b.name === currentBowler ? 'sc-fullcard__row--live' : ''}>
                          <td className="sc-fullcard__td--name">{b.name}</td>
                          <td>{formatOvers(b.legalBalls)}</td>
                          <td className="sc-fullcard__muted">{b.maidens}</td>
                          <td>{b.runs}</td>
                          <td><strong>{b.wickets}</strong></td>
                          <td className="sc-fullcard__muted">{b.legalBalls > 0 ? (b.runs / (b.legalBalls / 6)).toFixed(2) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function nonStrikerInInnings(deliveries, inningsNum, striker) {
  const last = [...deliveries].reverse().find(d => d.innings === inningsNum && !d.isRetirement)
  return last?.striker === striker ? last?.nonStriker : last?.striker
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_WICKET_FORM = { type: 'Bowled', fielder: '', outBatsman: '' }
const DEFAULT_RETIRE_FORM = { batter: 'striker', type: 'Hurt' }

export default function LiveScorecard({ matchData, deliveries, scorecardState, onChange, squad = {} }) {
  const {
    phase, innings, battingTeam, bowlingTeam,
    striker, nonStriker, currentBowler, overNum, legalBallsInOver,
    followOnTaken, matchResult, retiredBatters = [], isFreeHit = false,
  } = scorecardState

  const isTestFormat = matchData?.format === 'Test' || matchData?.matchType === 'Test' || matchData?.matchType === 'First Class'
  const maxOvers = isTestFormat ? Infinity : (matchData?.overs || 20)
  const maxInnings = isTestFormat ? 4 : 2
  const followOnThreshold = matchData?.matchType === 'First Class' ? 150 : 200
  const noBallPenalty = matchData?.noBallPenalty ?? 1

  const [setupForm, setSetupForm] = useState({
    battingTeam: defaultBattingTeam(matchData),
    striker: '', nonStriker: '', bowler: '',
  })

  const sqBattingTeam = battingTeam || setupForm.battingTeam
  const sqBowlingTeam = bowlingTeam || (sqBattingTeam === matchData?.team1 ? matchData?.team2 : matchData?.team1)

  // XI filter: if a playing XI was set for a team, restrict to those players
  const xiFor = (teamName) => {
    const xi = teamName === matchData?.team1 ? matchData?.team1XI
             : teamName === matchData?.team2 ? matchData?.team2XI
             : null
    return xi?.length ? new Set(xi) : null
  }
  const filterByXI = (players, teamName) => {
    const xi = xiFor(teamName)
    return xi ? players.filter(p => xi.has(p.name)) : players
  }

  const batterNames = filterByXI(squad[sqBattingTeam] || [], sqBattingTeam).map(p => p.name)
  const bowlerNames = filterByXI(squad[sqBowlingTeam] || [], sqBowlingTeam)
    .slice()
    .sort((a, b) => {
      const pri = r => (r === 'Bowler' || r === 'All-rounder' ? 0 : 1)
      return pri(a.role) - pri(b.role)
    })
    .map(p => p.name)

  const [uiMode, setUiMode] = useState(() => {
    if (phase === 'scoring') {
      if (!striker || !nonStriker) return 'newBatsman'
      if (!currentBowler) return 'newBowler'
    }
    return 'normal'
  })

  useEffect(() => {
    if (phase === 'scoring') {
      if (!striker || !nonStriker) { setUiMode('newBatsman'); return }
      if (!currentBowler) { setUiMode('newBowler'); return }
    }
  }, [phase, striker, nonStriker, currentBowler])

  const [pendingExtra, setPendingExtra] = useState(null)
  const [wicketForm, setWicketForm] = useState(DEFAULT_WICKET_FORM)
  const [retireForm, setRetireForm] = useState(DEFAULT_RETIRE_FORM)
  const [newBatsmanInput, setNewBatsmanInput] = useState('')
  const [newBowlerInput, setNewBowlerInput] = useState('')
  const [needBowlerAfterBatsman, setNeedBowlerAfterBatsman] = useState(false)
  const [showFullScorecard, setShowFullScorecard] = useState(false)
  const [milestone, setMilestone] = useState(null)

  const score = useMemo(() => computeScore(deliveries, innings), [deliveries, innings])
  const strikerStats = useMemo(() => getBatsmanStats(deliveries, innings, striker), [deliveries, innings, striker])
  const nonStrikerStats = useMemo(() => getBatsmanStats(deliveries, innings, nonStriker), [deliveries, innings, nonStriker])
  const bowlerFigs = useMemo(() => getBowlerFigures(deliveries, innings, currentBowler), [deliveries, innings, currentBowler])
  const overBalls = useMemo(() => getOverBalls(deliveries, innings, overNum), [deliveries, innings, overNum])

  // Bowler of the just-completed over (overNum is already incremented when newBowler prompt shows)
  const prevOverBowler = useMemo(() => {
    if (overNum === 0) return null
    return deliveries.find(d => d.innings === innings && d.overNum === overNum - 1 && !d.isRetirement)?.bowler || null
  }, [deliveries, innings, overNum])

  // Last 2 distinct bowlers to show pinned at top of dropdown [secondPrev, prev]
  const recentBowlerPins = useMemo(() => {
    const pins = []
    if (overNum > 1) {
      const b = deliveries.find(d => d.innings === innings && d.overNum === overNum - 2 && !d.isRetirement)?.bowler || null
      if (b && b !== prevOverBowler) pins.push(b)
    }
    if (prevOverBowler) pins.push(prevOverBowler)
    return pins
  }, [deliveries, innings, overNum, prevOverBowler])

  // All bowling-side players for the fielder picker, keeper first
  const fielderGroups = useMemo(() => {
    const sqd = filterByXI(squad[sqBowlingTeam] || [], sqBowlingTeam)
    if (!sqd.length) return null
    const keepers = sqd.filter(p => p.role === 'Wicket-keeper').map(p => p.name)
    const rest    = sqd.filter(p => p.role !== 'Wicket-keeper').map(p => p.name)
    const groups = []
    if (keepers.length) groups.push({ label: 'Wicket-keeper', names: keepers })
    if (rest.length)    groups.push({ label: 'Fielders', names: rest })
    return groups.length ? groups : null
  }, [squad, sqBowlingTeam, matchData?.team1XI, matchData?.team2XI])

  const fielderNames = useMemo(() => filterByXI(squad[sqBowlingTeam] || [], sqBowlingTeam).map(p => p.name), [squad, sqBowlingTeam, matchData?.team1XI, matchData?.team2XI])

  // Bowlers grouped by role for the new-bowler picker
  const bowlerGroups = useMemo(() => {
    const sqd = filterByXI(squad[sqBowlingTeam] || [], sqBowlingTeam)
    if (!sqd.length) return null
    const pinnedSet = new Set(recentBowlerPins)
    const groups = []
    if (recentBowlerPins.length > 0) groups.push({ label: 'Recent', names: recentBowlerPins })
    const specialists = sqd.filter(p => (p.role === 'Bowler' || p.role === 'All-rounder') && !pinnedSet.has(p.name)).map(p => p.name)
    const others = sqd.filter(p => p.role !== 'Bowler' && p.role !== 'All-rounder' && !pinnedSet.has(p.name)).map(p => p.name)
    if (specialists.length) groups.push({ label: 'Bowlers & All-rounders', names: specialists })
    if (others.length) groups.push({ label: 'Batters', names: others })
    return groups.length ? groups : null
  }, [squad, sqBowlingTeam, recentBowlerPins, matchData?.team1XI, matchData?.team2XI])

  // Batters unavailable to come in: anyone who has appeared this innings, minus retired-hurt returners
  const unavailableBatters = useMemo(() => {
    const names = new Set([striker, nonStriker].filter(Boolean))
    const retiredHurtSet = new Set(
      retiredBatters.filter(rb => rb.innings === innings && rb.type === 'Hurt').map(rb => rb.name)
    )
    for (const d of deliveries) {
      if (d.innings !== innings) continue
      if (d.isRetirement) {
        if (d.retirementType === 'Out') names.add(d.retiredBatter)
      } else {
        if (d.striker) names.add(d.striker)
        if (d.nonStriker) names.add(d.nonStriker)
      }
    }
    for (const n of retiredHurtSet) names.delete(n)
    return names
  }, [deliveries, innings, striker, nonStriker, retiredBatters])

  const getBattingTeam = (n) => inningsBattingTeam(deliveries, n)

  const target = useMemo(
    () => computeTarget(deliveries, innings, battingTeam),
    [deliveries, innings, battingTeam]
  )
  const required = target !== null ? target - score.runs : null
  const ballsRemaining = !isTestFormat ? maxOvers * 6 - score.legalBalls : null
  const rrr = (required !== null && required > 0 && ballsRemaining !== null && ballsRemaining > 0)
    ? ((required / ballsRemaining) * 6).toFixed(2) : null
  const crr = score.legalBalls > 0 ? (score.runs / (score.legalBalls / 6)).toFixed(2) : null
  const isChasingInnings = innings === maxInnings

  const partnership = useMemo(() => computeCurrentPartnership(deliveries, innings), [deliveries, innings])

  const maxOversPerBowler = isTestFormat ? Infinity : Math.floor(maxOvers / 5)
  const oversPerBowler = useMemo(() => getOversPerBowler(deliveries, innings), [deliveries, innings])
  const atLimitBowlers = useMemo(() =>
    Object.entries(oversPerBowler)
      .filter(([_, balls]) => balls >= maxOversPerBowler * 6)
      .map(([name]) => name),
    [oversPerBowler, maxOversPerBowler]
  )

  const cumulativeByOver = useMemo(() => {
    const byOver = {}
    for (const d of deliveries) {
      if (d.innings !== innings || d.isRetirement) continue
      if (!byOver[d.overNum]) byOver[d.overNum] = []
      byOver[d.overNum].push(d)
    }
    const map = {}
    let cumR = 0, cumW = 0
    for (const ovNum of Object.keys(byOver).map(Number).sort((a, b) => a - b)) {
      cumR += byOver[ovNum].reduce((s, d) => s + d.batRuns + d.extraRuns, 0)
      cumW += byOver[ovNum].filter(d => d.wicket).length
      map[ovNum] = { runs: cumR, wickets: cumW }
    }
    return map
  }, [deliveries, innings])

  // Auto-dismiss milestone notification
  useEffect(() => {
    if (!milestone) return
    const id = setTimeout(() => setMilestone(null), 5000)
    return () => clearTimeout(id)
  }, [milestone])

  // Refs so keyboard handler always sees current values without re-attaching
  const recordDeliveryRef = useRef()
  recordDeliveryRef.current = recordDelivery
  const strikerRef = useRef(striker)
  strikerRef.current = striker

  // Auto-focus first interactive element when a prompt opens
  useEffect(() => {
    if (uiMode === 'normal') return
    const t = setTimeout(() => {
      const el = document.querySelector('.sc-prompt select, .sc-prompt input')
      el?.focus()
    }, 30)
    return () => clearTimeout(t)
  }, [uiMode])

  // Keyboard shortcuts: 0–4, 6 = runs; W = wicket; Esc = cancel any prompt
  useEffect(() => {
    if (phase !== 'scoring') return
    const onKey = (e) => {
      if (e.target.matches('input, select, textarea, button')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (uiMode === 'normal') {
        if (['0', '1', '2', '3', '4', '6'].includes(e.key)) {
          e.preventDefault()
          recordDeliveryRef.current({ batRuns: Number(e.key) })
        } else if (e.key === 'w' || e.key === 'W') {
          e.preventDefault()
          setWicketForm({ ...DEFAULT_WICKET_FORM, outBatsman: strikerRef.current })
          setUiMode('wicket')
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setPendingExtra(null)
        setUiMode('normal')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, uiMode])

  // Retired hurt batters available to return (current innings only)
  const canReturnBatters = retiredBatters.filter(rb => rb.innings === innings && rb.type === 'Hurt')

  const getNextInningsTeams = (nextInnings, followOn) => {
    const team1 = getBattingTeam(1) || matchData?.team1 || ''
    const team2 = getBattingTeam(2) || (team1 === matchData?.team1 ? matchData?.team2 : matchData?.team1) || ''
    if (followOn) return { batting: team2, bowling: team1 }
    const normalOrder = [team1, team2, team1, team2]
    const followOnOrder = [team1, team2, team2, team1]
    const order = followOnTaken ? followOnOrder : normalOrder
    const batting = order[nextInnings - 1] || team1
    return { batting, bowling: batting === team1 ? team2 : team1 }
  }

  // ─── Setup ───────────────────────────────────────────────────────────────────

  const submitSetup = (e) => {
    e.preventDefault()
    const otherTeam = setupForm.battingTeam === matchData?.team1 ? matchData?.team2 : matchData?.team1
    onChange({
      deliveries,
      scorecardState: {
        ...scorecardState,
        phase: 'scoring',
        battingTeam: setupForm.battingTeam,
        bowlingTeam: otherTeam || '',
        striker: setupForm.striker.trim(),
        nonStriker: setupForm.nonStriker.trim(),
        currentBowler: setupForm.bowler.trim(),
        overNum: 0, legalBallsInOver: 0,
      },
    })
    setUiMode('normal')
  }

  // ─── Delivery recording ───────────────────────────────────────────────────────

  const recordDelivery = ({ batRuns = 0, extraRuns = 0, extraType = null, wicket = null }) => {
    const isLegal = extraType !== 'wide' && extraType !== 'noball'
    const totalRuns = batRuns + extraRuns

    // Pre-delivery stats for milestone detection
    const preStrikerRuns = getBatsmanStats(deliveries, innings, striker).runs
    const preBowlerWickets = getBowlerFigures(deliveries, innings, currentBowler).wickets

    // Compute free-hit state for the NEXT delivery
    const applyFreeHitRule = matchData?.applyFreeHit ?? !isTestFormat
    const nextIsFreeHit = !applyFreeHitRule ? false
      : extraType === 'noball' ? true
      : (isFreeHit && extraType === 'wide') ? true
      : false

    const delivery = {
      innings, overNum, bowler: currentBowler,
      striker, nonStriker, battingTeam, bowlingTeam,
      batRuns, extraRuns, extraType, totalRuns, isLegalDelivery: isLegal, wicket,
    }

    const newDeliveries = [...deliveries, delivery]
    const newScore = computeScore(newDeliveries, innings)

    // ── Milestone detection ───────────────────────────────────────────────────
    const postStrikerRuns = getBatsmanStats(newDeliveries, innings, striker).runs
    for (const m of [50, 100, 150, 200]) {
      if (preStrikerRuns < m && postStrikerRuns >= m) {
        setMilestone(`${striker} reaches ${m}!`)
        break
      }
    }
    if (wicket && wicket.type !== 'Run Out' && wicket.type !== 'Retired Hurt') {
      const postBowlerWickets = getBowlerFigures(newDeliveries, innings, currentBowler).wickets
      if (postBowlerWickets === 5 && preBowlerWickets === 4) {
        setMilestone(`${currentBowler} — 5-wicket haul!`)
      } else {
        const bowlerLegalDels = newDeliveries.filter(
          d => d.innings === innings && !d.isRetirement && d.bowler === currentBowler && d.isLegalDelivery
        )
        if (bowlerLegalDels.length >= 3) {
          const last3 = bowlerLegalDels.slice(-3)
          if (last3.every(d => d.wicket && d.wicket.type !== 'Run Out' && d.wicket.type !== 'Retired Hurt')) {
            setMilestone(`HAT-TRICK! ${currentBowler}!`)
          }
        }
      }
    }

    // Win by wickets in chasing innings
    if (isChasingInnings && target !== null) {
      const wicketsInInnings = newDeliveries.filter(d => d.innings === innings && d.wicket).length
      const wicketsRemaining = 10 - wicketsInInnings
      if (newScore.runs >= target) {
        const result = `${battingTeam} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`
        onChange({ deliveries: newDeliveries, scorecardState: { ...scorecardState, isFreeHit: false, phase: 'ended', matchResult: result } })
        setUiMode('normal')
        return
      }
    }

    let newStriker = striker
    let newNonStriker = nonStriker
    // Penalty extras (the wide itself, the no-ball penalty) don't cause batters to cross.
    // Only bat runs and genuine bye/leg-bye extras determine the swap.
    const swapRuns = extraType === 'wide'
      ? extraRuns - 1          // subtract the 1-run wide penalty; remaining are bye runs
      : extraType === 'noball'
      ? batRuns                // no-ball penalty doesn't count; only bat runs
      : totalRuns              // byes, leg byes, normal — all runs count
    if (swapRuns % 2 === 1) [newStriker, newNonStriker] = [newNonStriker, newStriker]

    if (wicket) {
      if (wicket.outBatsman === newStriker) newStriker = ''
      else newNonStriker = ''
    }

    let newLegal = legalBallsInOver
    let newOverNum = overNum
    let overComplete = false
    if (isLegal) {
      newLegal = legalBallsInOver + 1
      if (newLegal === 6) {
        overComplete = true; newLegal = 0; newOverNum = overNum + 1
        ;[newStriker, newNonStriker] = [newNonStriker, newStriker]
      }
    }

    // Innings end: all out or overs exhausted
    const totalWickets = newDeliveries.filter(d => d.innings === innings && d.wicket).length
    const oversExhausted = !isTestFormat && newOverNum >= maxOvers

    if (totalWickets >= 10 || oversExhausted) {
      // Win by innings (Test: innings 3, follow-on, follow-on team still behind)
      if (isTestFormat && innings === 3 && followOnTaken) {
        const s1 = computeScore(newDeliveries, 1)
        const s2 = computeScore(newDeliveries, 2)
        const s3 = computeScore(newDeliveries, 3)
        const team1 = inningsBattingTeam(newDeliveries, 1)
        const team2Total = s2.runs + s3.runs
        if (team2Total < s1.runs) {
          const margin = s1.runs - team2Total
          onChange({
            deliveries: newDeliveries,
            scorecardState: {
              ...scorecardState,
              striker: newStriker, nonStriker: newNonStriker,
              overNum: newOverNum, legalBallsInOver: newLegal,
              isFreeHit: false, phase: 'ended',
              matchResult: `${team1} won by an innings and ${margin} run${margin !== 1 ? 's' : ''}`,
            },
          })
          setUiMode('normal')
          return
        }
      }

      // Win/loss by runs in final innings
      if (innings >= maxInnings) {
        const tgt = computeTarget(newDeliveries, innings, battingTeam)
        const shortfall = tgt !== null ? tgt - 1 - newScore.runs : 0
        const result = shortfall > 0
          ? `${bowlingTeam} won by ${shortfall} run${shortfall !== 1 ? 's' : ''}`
          : `${battingTeam} won`
        onChange({
          deliveries: newDeliveries,
          scorecardState: {
            ...scorecardState,
            striker: newStriker, nonStriker: newNonStriker,
            overNum: newOverNum, legalBallsInOver: newLegal,
            isFreeHit: false, phase: 'ended', matchResult: result,
          },
        })
        setUiMode('normal')
        return
      }

      onChange({
        deliveries: newDeliveries,
        scorecardState: {
          ...scorecardState,
          striker: newStriker, nonStriker: newNonStriker,
          overNum: newOverNum, legalBallsInOver: newLegal,
          isFreeHit: false, phase: 'inningsBreak',
        },
      })
      setUiMode('normal')
      return
    }

    onChange({
      deliveries: newDeliveries,
      scorecardState: { ...scorecardState, striker: newStriker, nonStriker: newNonStriker, overNum: newOverNum, legalBallsInOver: newLegal, isFreeHit: nextIsFreeHit },
    })

    if (wicket) {
      setNeedBowlerAfterBatsman(overComplete)
      setNewBatsmanInput('')
      setUiMode('newBatsman')
    } else if (overComplete) {
      setNewBowlerInput('')
      setUiMode('newBowler')
    } else {
      setUiMode('normal')
    }
  }

  // ─── Penalty runs ─────────────────────────────────────────────────────────────

  const handlePenalty = (to) => {
    const penaltyDelivery = {
      innings, overNum, bowler: currentBowler,
      striker, nonStriker, battingTeam, bowlingTeam,
      batRuns: 0, extraRuns: to === 'batting' ? 5 : 0, extraType: 'penalty',
      totalRuns: to === 'batting' ? 5 : 0, isLegalDelivery: false, wicket: null,
      penaltyTo: to, penaltyRuns: 5,
    }
    onChange({ deliveries: [...deliveries, penaltyDelivery], scorecardState })
    setUiMode('normal')
  }

  // ─── Swap batters ─────────────────────────────────────────────────────────────

  const handleSwapBatters = () => {
    onChange({ deliveries, scorecardState: { ...scorecardState, striker: nonStriker, nonStriker: striker } })
  }

  // ─── Retirement ───────────────────────────────────────────────────────────────

  const handleRetire = () => {
    const name = retireForm.batter === 'striker' ? striker : nonStriker
    const type = retireForm.type // 'Hurt' | 'Out'

    // Record a non-delivery retirement marker in deliveries (for stats derivation)
    const retirementEvent = {
      innings, overNum, bowler: currentBowler,
      striker, nonStriker, battingTeam, bowlingTeam,
      batRuns: 0, extraRuns: 0, extraType: null, totalRuns: 0,
      isLegalDelivery: false, wicket: null,
      isRetirement: true, retiredBatter: name, retirementType: type,
    }

    const newDeliveries = [...deliveries, retirementEvent]

    // Only "Retired Hurt" can return
    const newRetiredBatters = type === 'Hurt'
      ? [...retiredBatters, { name, type, innings }]
      : retiredBatters

    const newStriker = retireForm.batter === 'striker' ? '' : striker
    const newNonStriker = retireForm.batter === 'nonStriker' ? '' : nonStriker

    onChange({
      deliveries: newDeliveries,
      scorecardState: {
        ...scorecardState,
        striker: newStriker, nonStriker: newNonStriker,
        retiredBatters: newRetiredBatters,
      },
    })
    setNewBatsmanInput('')
    setUiMode('newBatsman')
  }

  // ─── Undo ─────────────────────────────────────────────────────────────────────

  const handleUndo = () => {
    if (!deliveries.length) return
    const prev = deliveries[deliveries.length - 1]
    if (prev.innings !== innings) return
    const trimmed = deliveries.slice(0, -1)

    if (prev.isRetirement) {
      // Reverse retirement: restore batter to crease and remove from retired list
      onChange({
        deliveries: trimmed,
        scorecardState: {
          ...scorecardState,
          striker: prev.striker,
          nonStriker: prev.nonStriker,
          isFreeHit: false,
          retiredBatters: retiredBatters.filter(rb => rb.name !== prev.retiredBatter),
        },
      })
      setUiMode('normal')
      return
    }

    const legalTotal = trimmed.filter(d => d.innings === innings && d.isLegalDelivery).length
    onChange({
      deliveries: trimmed,
      scorecardState: {
        ...scorecardState,
        striker: prev.striker, nonStriker: prev.nonStriker,
        currentBowler: prev.bowler,
        overNum: Math.floor(legalTotal / 6), legalBallsInOver: legalTotal % 6,
        isFreeHit: false,
      },
    })
    setUiMode('normal')
  }

  const confirmNewBatsman = () => {
    const name = newBatsmanInput.trim()
    if (!name) return

    // If this batter was retired hurt, remove them from the retired list
    const isReturning = canReturnBatters.some(rb => rb.name === name)
    const newRetiredBatters = isReturning
      ? retiredBatters.filter(rb => !(rb.name === name && rb.innings === innings))
      : retiredBatters

    const newSt = scorecardState.striker || name
    const newNst = scorecardState.nonStriker || (scorecardState.striker ? name : nonStriker)
    onChange({
      deliveries,
      scorecardState: {
        ...scorecardState,
        striker: newSt,
        nonStriker: newSt === name ? newNst : name,
        retiredBatters: newRetiredBatters,
      },
    })
    setNewBatsmanInput('')
    if (needBowlerAfterBatsman) {
      setNeedBowlerAfterBatsman(false)
      setNewBowlerInput('')
      setUiMode('newBowler')
    } else {
      setUiMode('normal')
    }
  }

  const confirmNewBowler = () => {
    const name = newBowlerInput.trim()
    if (!name || name === prevOverBowler) return
    onChange({ deliveries, scorecardState: { ...scorecardState, currentBowler: name } })
    setNewBowlerInput('')
    setUiMode('normal')
  }

  const handleEndInnings = () => {
    if (isTestFormat && innings === 3 && followOnTaken) {
      const s1 = computeScore(deliveries, 1)
      const s2 = computeScore(deliveries, 2)
      const s3 = computeScore(deliveries, 3)
      const team1 = getBattingTeam(1)
      const team2Total = s2.runs + s3.runs
      if (team2Total < s1.runs) {
        const margin = s1.runs - team2Total
        onChange({
          deliveries,
          scorecardState: {
            ...scorecardState, phase: 'ended',
            matchResult: `${team1} won by an innings and ${margin} run${margin !== 1 ? 's' : ''}`,
          },
        })
        return
      }
    }
    const newPhase = innings >= maxInnings ? 'ended' : 'inningsBreak'
    onChange({ deliveries, scorecardState: { ...scorecardState, phase: newPhase, matchResult: newPhase === 'ended' ? 'Match ended' : '' } })
  }

  const startNextInnings = (followOn = false) => {
    const nextInnings = innings + 1
    const { batting, bowling } = getNextInningsTeams(nextInnings, followOn)
    setSetupForm({ battingTeam: batting, striker: '', nonStriker: '', bowler: '' })
    onChange({
      deliveries,
      scorecardState: {
        ...scorecardState,
        phase: 'setup', innings: nextInnings,
        battingTeam: batting, bowlingTeam: bowling,
        striker: '', nonStriker: '', currentBowler: '',
        overNum: 0, legalBallsInOver: 0,
        followOnTaken: followOn || (followOnTaken || false),
        matchResult: '', retiredBatters: [],
      },
    })
    setUiMode('normal')
  }

  const endMatch = () => {
    onChange({ deliveries, scorecardState: { ...scorecardState, phase: 'ended', matchResult: matchResult || 'Match ended' } })
  }

  // ─── Setup phase ──────────────────────────────────────────────────────────────

  if (phase === 'setup') {
    const teams = [matchData?.team1, matchData?.team2].filter(Boolean)
    const setupBattingTeam = setupForm.battingTeam
    const setupBowlingTeam = setupBattingTeam === matchData?.team1 ? matchData?.team2 : matchData?.team1
    const setupBatterNames = (squad[setupBattingTeam] || []).map(p => p.name)
    const setupBowlerNames = (squad[setupBowlingTeam] || [])
      .slice()
      .sort((a, b) => {
        const pri = r => (r === 'Bowler' || r === 'All-rounder' ? 0 : 1)
        return pri(a.role) - pri(b.role)
      })
      .map(p => p.name)

    const setupSqd = squad[setupBowlingTeam] || []
    const setupBowlerGroups = setupSqd.length ? (() => {
      const specialists = setupSqd.filter(p => p.role === 'Bowler' || p.role === 'All-rounder').map(p => p.name)
      const others = setupSqd.filter(p => p.role !== 'Bowler' && p.role !== 'All-rounder').map(p => p.name)
      const groups = []
      if (specialists.length) groups.push({ label: 'Bowlers & All-rounders', names: specialists })
      if (others.length) groups.push({ label: 'Batters', names: others })
      return groups.length ? groups : null
    })() : null

    return (
      <div className="sc-setup">
        <h2>{ordinal(innings)} Innings Setup</h2>
        {innings > 1 && (
          <div className="sc-setup__prev-scores">
            {Array.from({ length: innings - 1 }, (_, i) => i + 1).map(n => {
              const s = computeScore(deliveries, n)
              if (!s.legalBalls) return null
              return (
                <div key={n} className="sc-setup__innings1">
                  Innings {n} — {getBattingTeam(n)}: <strong>{s.runs}/{s.wickets}</strong> ({s.overs}.{s.balls} ov)
                </div>
              )
            })}
          </div>
        )}
        <form onSubmit={submitSetup} className="sc-setup__form">
          <div className="form-group">
            <label>Batting Team</label>
            <select
              value={setupForm.battingTeam}
              onChange={e => setSetupForm(f => ({ ...f, battingTeam: e.target.value, striker: '', nonStriker: '', bowler: '' }))}
              required
            >
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Opener (on strike)</label>
            <PlayerPicker names={setupBatterNames} value={setupForm.striker} onChange={v => setSetupForm(f => ({ ...f, striker: v }))} placeholder="Select opener…" className="sc-setup__input" disabledNames={setupForm.nonStriker ? [setupForm.nonStriker] : []} />
          </div>
          <div className="form-group">
            <label>Opener (non-strike)</label>
            <PlayerPicker names={setupBatterNames} value={setupForm.nonStriker} onChange={v => setSetupForm(f => ({ ...f, nonStriker: v }))} placeholder="Select opener…" className="sc-setup__input" disabledNames={setupForm.striker ? [setupForm.striker] : []} />
          </div>
          <div className="form-group">
            <label>Opening Bowler</label>
            <PlayerPicker names={setupBowlerNames} groups={setupBowlerGroups} value={setupForm.bowler} onChange={v => setSetupForm(f => ({ ...f, bowler: v }))} placeholder="Select bowler…" className="sc-setup__input" />
          </div>
          {(() => {
            const hint = !setupForm.striker.trim() ? 'Select the opener on strike'
              : !setupForm.nonStriker.trim() ? 'Select the opener off strike'
              : setupForm.striker.trim() === setupForm.nonStriker.trim() ? 'Both openers must be different players'
              : !setupForm.bowler.trim() ? 'Select the opening bowler'
              : null
            return hint ? <p className="sc-setup__hint">{hint}</p> : null
          })()}
          <button type="submit" className="sc-btn sc-btn--primary" disabled={!setupForm.striker.trim() || !setupForm.nonStriker.trim() || !setupForm.bowler.trim() || setupForm.striker.trim() === setupForm.nonStriker.trim()}>
            Start Innings
          </button>
        </form>
      </div>
    )
  }

  // ─── Innings break ────────────────────────────────────────────────────────────

  if (phase === 'inningsBreak') {
    const nextInnings = innings + 1
    const isLastInnings = innings >= maxInnings
    const playedScores = Array.from({ length: innings }, (_, i) => i + 1).map(n => ({
      n, team: getBattingTeam(n), score: computeScore(deliveries, n),
    }))
    const canOfferFollowOn = isTestFormat && innings === 2
    const s1 = computeScore(deliveries, 1)
    const s2 = computeScore(deliveries, 2)
    const deficit = s1.runs - s2.runs
    const followOnEligible = canOfferFollowOn && deficit >= followOnThreshold

    return (
      <div className="sc-break">
        <h2>Innings {innings} Complete</h2>
        {playedScores.map(({ n, team, score: s }) => (
          <div key={n} className="sc-break__score">
            <span>{team} <span className="sc-break__inns-label">({ordinal(n)} inn)</span></span>
            <span className="sc-break__runs">{s.runs}/{s.wickets}</span>
            <span className="sc-break__overs">({s.overs}.{s.balls} ov)</span>
          </div>
        ))}
        {followOnEligible && (
          <div className="sc-break__followon">
            Follow-on available — {getBattingTeam(1)} lead by {deficit} runs (threshold: {followOnThreshold})
          </div>
        )}
        <div className="sc-break__actions">
          {followOnEligible && (
            <button className="sc-btn sc-btn--followon" onClick={() => startNextInnings(true)}>Enforce Follow-on</button>
          )}
          {!isLastInnings && (
            <button className="sc-btn sc-btn--primary" onClick={() => startNextInnings(false)}>
              Start {ordinal(nextInnings)} Innings
            </button>
          )}
          {isLastInnings
            ? <button className="sc-btn sc-btn--primary" onClick={endMatch}>Complete Match</button>
            : <button className="sc-btn sc-btn--secondary" onClick={endMatch}>End Match (Draw)</button>
          }
        </div>
      </div>
    )
  }

  // ─── Match ended ──────────────────────────────────────────────────────────────

  if (phase === 'ended') {
    const allInnings = [1, 2, 3, 4]
      .map(n => ({ n, team: getBattingTeam(n), score: computeScore(deliveries, n) }))
      .filter(x => x.score.legalBalls > 0)
    return (
      <div className="sc-break">
        <h2>Match Complete</h2>
        {matchResult && <div className="sc-break__result">{matchResult}</div>}
        {allInnings.map(({ n, team, score: s }) => (
          <div key={n} className="sc-break__score">
            <span>{team} <span className="sc-break__inns-label">({ordinal(n)} inn)</span></span>
            <span className="sc-break__runs">{s.runs}/{s.wickets}</span>
            <span className="sc-break__overs">({s.overs}.{s.balls} ov)</span>
          </div>
        ))}
        <p className="sc-break__note">Check the View Statistics tab for full scorecard.</p>
      </div>
    )
  }

  // ─── Scoring phase ────────────────────────────────────────────────────────────

  const remainingSlots = Math.max(0, 6 - legalBallsInOver)
  const endBtnLabel = isTestFormat && innings < maxInnings
    ? 'Declare'
    : innings >= maxInnings ? 'End Match' : innings === 1 ? 'End Innings' : 'End Match'

  return (
    <div className="sc-root">
      {milestone && (
        <div className="sc-milestone" role="status">
          {milestone}
          <button className="sc-milestone__close" onClick={() => setMilestone(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ── Scoreboard ── */}
      <div className="sc-board">
        <div className="sc-board__team">{battingTeam} · {ordinal(innings)} Innings</div>
        <div className="sc-board__score">
          {score.runs}<span className="sc-board__sep">/</span>{score.wickets}
        </div>
        <div className="sc-board__overs">
          ({score.overs}.{score.balls} ov{crr ? ` · CRR ${crr}` : ''}{!isTestFormat && ballsRemaining !== null ? ` · ${ballsRemaining} balls rem` : ''})
        </div>
        {isChasingInnings && target !== null && target > 0 && (
          <div className="sc-board__target">
            <div className="sc-board__target-metric"><span className="sc-board__target-label">Target</span><span className="sc-board__target-val">{target}</span></div>
            <div className="sc-board__target-metric"><span className="sc-board__target-label">Need</span><span className="sc-board__target-val">{required}</span></div>
            {crr && <div className="sc-board__target-metric"><span className="sc-board__target-label">CRR</span><span className="sc-board__target-val">{crr}</span></div>}
            {rrr && <div className="sc-board__target-metric sc-board__target-metric--rrr"><span className="sc-board__target-label">RRR</span><span className="sc-board__target-val">{rrr}</span></div>}
            {ballsRemaining !== null && <div className="sc-board__target-metric"><span className="sc-board__target-label">Balls</span><span className="sc-board__target-val">{ballsRemaining}</span></div>}
          </div>
        )}
        {isChasingInnings && target !== null && target <= 0 && (
          <div className="sc-board__target sc-board__target--won">{battingTeam} have won!</div>
        )}
        {!isChasingInnings && innings > 1 && target !== null && (
          <div className="sc-board__lead">
            {(() => {
              const lead = score.runs - (target - 1)
              return lead >= 0
                ? `Leading by ${lead} run${lead !== 1 ? 's' : ''}`
                : `Trailing by ${-lead} run${lead !== -1 ? 's' : ''}`
            })()}
          </div>
        )}
        {innings > 1 && (
          <div className="sc-board__prev">
            {Array.from({ length: innings - 1 }, (_, i) => i + 1).map(n => {
              const s = computeScore(deliveries, n)
              return s.legalBalls > 0
                ? <span key={n}>{getBattingTeam(n)}: {s.runs}/{s.wickets}</span>
                : null
            })}
          </div>
        )}
      </div>

      {/* ── Batsmen ── */}
      <div className="sc-batsmen">
        <div className="sc-batsman sc-batsman--striker">
          <div className="sc-batsman__name">{striker} <span className="sc-strike-dot">●</span></div>
          <div className="sc-batsman__score">{strikerStats.runs}<span className="sc-batsman__balls"> ({strikerStats.balls})</span></div>
          <div className="sc-batsman__detail">
            SR {strikerStats.balls > 0 ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(0) : 0}
            &nbsp;&nbsp;{strikerStats.fours}×4&nbsp;{strikerStats.sixes}×6
          </div>
        </div>
        <div className="sc-batsman">
          <div className="sc-batsman__name">{nonStriker}</div>
          <div className="sc-batsman__score">{nonStrikerStats.runs}<span className="sc-batsman__balls"> ({nonStrikerStats.balls})</span></div>
          <div className="sc-batsman__detail">
            SR {nonStrikerStats.balls > 0 ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(0) : 0}
            &nbsp;&nbsp;{nonStrikerStats.fours}×4&nbsp;{nonStrikerStats.sixes}×6
          </div>
        </div>
      </div>

      {/* ── Partnership & Free Hit ── */}
      {striker && nonStriker && (
        <div className="sc-partnership">
          Partnership: <strong>{partnership.runs}</strong> runs ({partnership.balls} balls)
        </div>
      )}
      {isFreeHit && <div className="sc-free-hit">⚡ FREE HIT! ⚡</div>}

      {/* ── Bowler + current over ── */}
      <div className="sc-over">
        <div className="sc-over__bowler">
          <span className="sc-over__name">{currentBowler}</span>
          <span className="sc-over__figs">{bowlerFigs.overs}-{bowlerFigs.wides}wd-{bowlerFigs.runs}-{bowlerFigs.wickets}</span>
        </div>
        <div className="sc-over__balls">
          <span className="sc-over__label">Over {overNum + 1}</span>
          {overBalls.map((d, i) => <Ball key={i} d={d} />)}
          {Array.from({ length: remainingSlots }).map((_, i) => (
            <span key={`e${i}`} className="sc-ball sc-ball--empty" />
          ))}
        </div>
      </div>

      {/* ── Entry panel ── */}
      <div className="sc-entry">
        {uiMode === 'normal' && (
          <>
            <div className="sc-entry__label">Runs off bat</div>
            <div className="sc-entry__row">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button key={r} className={`sc-btn sc-btn--ball ${r === 4 ? 'sc-btn--four' : r === 6 ? 'sc-btn--six' : ''}`} onClick={() => recordDelivery({ batRuns: r })}>
                  {r === 0 ? '·' : r}
                </button>
              ))}
              <button className="sc-btn sc-btn--ball sc-btn--wicket" onClick={() => { setWicketForm({ ...DEFAULT_WICKET_FORM, outBatsman: striker }); setUiMode('wicket') }}>W</button>
            </div>

            <div className="sc-entry__label">Extras</div>
            <div className="sc-entry__row sc-entry__row--extras">
              <button className="sc-btn sc-btn--extra" onClick={() => setUiMode('wideRuns')}>Wide</button>
              <button className="sc-btn sc-btn--extra" onClick={() => setUiMode('noBallRuns')}>No Ball</button>
              <button className="sc-btn sc-btn--extra" onClick={() => { setPendingExtra('bye'); setUiMode('extraRuns') }}>Bye</button>
              <button className="sc-btn sc-btn--extra" onClick={() => { setPendingExtra('legbye'); setUiMode('extraRuns') }}>Leg Bye</button>
              <button className="sc-btn sc-btn--penalty-btn" onClick={() => setUiMode('penalty')}>Penalty 5</button>
            </div>

            <div className="sc-entry__actions">
              <button className="sc-btn sc-btn--undo" onClick={handleUndo} disabled={!deliveries.length || deliveries[deliveries.length - 1]?.innings !== innings}>↩ Undo</button>
              <button className="sc-btn sc-btn--swap" onClick={handleSwapBatters} title="Swap striker / non-striker">⇄ Swap</button>
              <button className="sc-btn sc-btn--retire" onClick={() => { setRetireForm(DEFAULT_RETIRE_FORM); setUiMode('retireBatsman') }}>Retire</button>
              <button className="sc-btn sc-btn--end" onClick={handleEndInnings}>{endBtnLabel}</button>
            </div>
            <div className="sc-entry__hint" aria-hidden="true">Keys: 0–4, 6 = runs · W = wicket · Esc = cancel</div>
          </>
        )}

        {uiMode === 'wideRuns' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">Wide — total extras?</div>
            <div className="sc-prompt__subtitle">1 = just wide · 5 = wide to boundary</div>
            <div className="sc-entry__row">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} className="sc-btn sc-btn--ball" onClick={() => { recordDelivery({ extraRuns: r, extraType: 'wide' }); setUiMode('normal') }}>{r}</button>
              ))}
            </div>
            <button className="sc-btn sc-btn--cancel" onClick={() => setUiMode('normal')}>Cancel</button>
          </div>
        )}

        {uiMode === 'noBallRuns' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">No Ball — runs off the bat?</div>
            <div className="sc-prompt__subtitle">+{noBallPenalty} no-ball penalty added automatically</div>
            <div className="sc-entry__row">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  className={`sc-btn sc-btn--ball${r === 4 ? ' sc-btn--four' : r === 6 ? ' sc-btn--six' : ''}`}
                  onClick={() => { recordDelivery({ batRuns: r, extraRuns: noBallPenalty, extraType: 'noball' }); setUiMode('normal') }}
                >
                  {r === 0 ? '·' : r}
                </button>
              ))}
            </div>
            <button className="sc-btn sc-btn--cancel" onClick={() => setUiMode('normal')}>Cancel</button>
          </div>
        )}

        {uiMode === 'extraRuns' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">{pendingExtra === 'bye' ? 'Bye' : 'Leg Bye'} — how many runs?</div>
            <div className="sc-entry__row">
              {[1, 2, 3, 4].map(r => (
                <button key={r} className="sc-btn sc-btn--ball" onClick={() => { recordDelivery({ extraRuns: r, extraType: pendingExtra }); setPendingExtra(null) }}>{r}</button>
              ))}
            </div>
            <button className="sc-btn sc-btn--cancel" onClick={() => { setPendingExtra(null); setUiMode('normal') }}>Cancel</button>
          </div>
        )}

        {uiMode === 'penalty' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">Penalty — 5 runs awarded to:</div>
            <div className="sc-entry__row">
              <button className="sc-btn sc-btn--primary" onClick={() => handlePenalty('batting')}>{battingTeam} (batting)</button>
              <button className="sc-btn sc-btn--secondary" onClick={() => handlePenalty('fielding')}>{bowlingTeam} (fielding)</button>
            </div>
            <button className="sc-btn sc-btn--cancel" onClick={() => setUiMode('normal')}>Cancel</button>
          </div>
        )}

        {uiMode === 'wicket' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">Wicket!</div>
            {isFreeHit && (
              <div className="sc-prompt__note sc-prompt__note--freehit">⚡ Free hit — only Run Out allowed</div>
            )}
            <div className="form-group">
              <label>Dismissal</label>
              <select
                value={isFreeHit ? 'Run Out' : wicketForm.type}
                onChange={e => setWicketForm(f => ({ ...f, type: e.target.value }))}
                disabled={isFreeHit}
              >
                {(isFreeHit ? ['Run Out'] : DISMISSAL_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {['Caught', 'Stumped', 'Run Out'].includes(isFreeHit ? 'Run Out' : wicketForm.type) && (
              <div className="form-group">
                <label>{(isFreeHit ? 'Run Out' : wicketForm.type) === 'Stumped' ? 'Wicket-keeper' : 'Fielder'}</label>
                <PlayerPicker
                  names={fielderNames}
                  groups={fielderGroups}
                  value={wicketForm.fielder}
                  onChange={v => setWicketForm(f => ({ ...f, fielder: v }))}
                  placeholder="Select fielder…"
                />
              </div>
            )}
            <div className="form-group">
              <label>Batsman out</label>
              <select value={wicketForm.outBatsman} onChange={e => setWicketForm(f => ({ ...f, outBatsman: e.target.value }))}>
                <option value={striker}>{striker} (striker)</option>
                <option value={nonStriker}>{nonStriker} (non-striker)</option>
              </select>
            </div>
            <div className="sc-prompt__actions">
              <button className="sc-btn sc-btn--primary" onClick={() => { recordDelivery({ wicket: isFreeHit ? { ...wicketForm, type: 'Run Out' } : wicketForm }); setUiMode('newBatsman') }}>Confirm Wicket</button>
              <button className="sc-btn sc-btn--cancel" onClick={() => setUiMode('normal')}>Cancel</button>
            </div>
          </div>
        )}

        {uiMode === 'retireBatsman' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">Retire Batsman</div>
            <div className="form-group">
              <label>Who is retiring?</label>
              <select value={retireForm.batter} onChange={e => setRetireForm(f => ({ ...f, batter: e.target.value }))}>
                <option value="striker">{striker} (striker)</option>
                <option value="nonStriker">{nonStriker} (non-striker)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={retireForm.type} onChange={e => setRetireForm(f => ({ ...f, type: e.target.value }))}>
                <option value="Hurt">Retired Hurt — can return later</option>
                <option value="Out">Retired Out — cannot return</option>
              </select>
            </div>
            <div className="sc-prompt__actions">
              <button className="sc-btn sc-btn--primary" onClick={handleRetire}>Confirm Retirement</button>
              <button className="sc-btn sc-btn--cancel" onClick={() => setUiMode('normal')}>Cancel</button>
            </div>
          </div>
        )}

        {uiMode === 'newBatsman' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">New Batsman In</div>

            {/* Retired Hurt batters who can return */}
            {canReturnBatters.length > 0 && (
              <div className="sc-prompt__returning">
                <div className="sc-prompt__returning-label">Retired Hurt — can return</div>
                <div className="sc-entry__row">
                  {canReturnBatters.map(rb => (
                    <button
                      key={rb.name}
                      className={`sc-btn sc-btn--returning${newBatsmanInput === rb.name ? ' sc-btn--returning-active' : ''}`}
                      onClick={() => setNewBatsmanInput(newBatsmanInput === rb.name ? '' : rb.name)}
                    >
                      {rb.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Regular squad / manual entry */}
            {!canReturnBatters.some(rb => rb.name === newBatsmanInput) && (
              <PlayerPicker
                names={batterNames.filter(n =>
                  !unavailableBatters.has(n) && !canReturnBatters.some(rb => rb.name === n)
                )}
                value={newBatsmanInput}
                onChange={setNewBatsmanInput}
                placeholder="Select batsman…"
              />
            )}

            <button className="sc-btn sc-btn--primary" onClick={confirmNewBatsman} disabled={!newBatsmanInput.trim()}>Send In</button>
          </div>
        )}

        {uiMode === 'newBowler' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">Over {overNum + 1} — New Bowler</div>
            {prevOverBowler && (() => {
              const completedBalls = getOverBalls(deliveries, innings, overNum - 1)
              const ovR = completedBalls.reduce((s, d) => s + d.batRuns + d.extraRuns, 0)
              const ovW = completedBalls.filter(d => d.wicket).length
              const figs = getBowlerFigures(deliveries, innings, prevOverBowler)
              return (
                <div className="sc-prompt__note sc-prompt__note--over-summary">
                  {prevOverBowler}: over {ovR}{ovW > 0 ? `-${ovW}W` : ''} | total {figs.overs}-{figs.runs}-{figs.wickets}
                </div>
              )
            })()}
            {prevOverBowler && (
              <div className="sc-prompt__note">{prevOverBowler} cannot bowl consecutive overs</div>
            )}
            {!isTestFormat && atLimitBowlers.length > 0 && (
              <div className="sc-prompt__note">
                {atLimitBowlers.join(', ')} {atLimitBowlers.length === 1 ? 'has' : 'have'} reached the {maxOversPerBowler}-over limit
              </div>
            )}
            <PlayerPicker
              names={bowlerNames}
              groups={bowlerGroups}
              value={newBowlerInput}
              onChange={setNewBowlerInput}
              placeholder="Select bowler…"
              disabledNames={[...(prevOverBowler ? [prevOverBowler] : []), ...atLimitBowlers]}
            />
            <button
              className="sc-btn sc-btn--primary"
              onClick={confirmNewBowler}
              disabled={!newBowlerInput.trim() || newBowlerInput === prevOverBowler || atLimitBowlers.includes(newBowlerInput)}
            >
              Start Over
            </button>
          </div>
        )}
      </div>

      {/* ── Over history ── */}
      {overNum > 0 && (
        <div className="sc-history">
          <div className="sc-history__title">Over History</div>
          {Array.from({ length: overNum }, (_, ov) => overNum - 1 - ov).map(ov => {
            const balls = getOverBalls(deliveries, innings, ov)
            if (!balls.length) return null
            const ovRuns = balls.reduce((s, d) => s + d.batRuns + d.extraRuns, 0)
            const ovWkts = balls.filter(d => d.wicket).length
            const cum = cumulativeByOver[ov]
            return (
              <div key={ov} className="sc-history__row">
                <span className="sc-history__ov">Ov {ov + 1}</span>
                <span className="sc-history__bowler">{balls[0]?.bowler || ''}</span>
                <span className="sc-history__balls">{balls.map((d, i) => <Ball key={i} d={d} />)}</span>
                <span className="sc-history__summary">{ovRuns}{ovWkts > 0 ? `-${ovWkts}W` : ''}</span>
                {cum && <span className="sc-history__cum">{cum.runs}/{cum.wickets}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Full scorecard (expandable) ── */}
      <FullScorecard deliveries={deliveries} currentInnings={innings} currentStriker={striker} currentBowler={currentBowler} show={showFullScorecard} onToggle={() => setShowFullScorecard(s => !s)} />
    </div>
  )
}
