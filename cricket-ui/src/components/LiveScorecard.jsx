import { useState, useMemo, useEffect } from 'react'
import './LiveScorecard.css'

const DISMISSAL_TYPES = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Retired Hurt']

// ─── Pure stat derivations ────────────────────────────────────────────────────

function computeScore(deliveries, innings) {
  const inns = deliveries.filter(d => d.innings === innings)
  const runs = inns.reduce((s, d) => s + d.batRuns + d.extraRuns, 0)
  const wickets = inns.filter(d => d.wicket).length
  const legalBalls = inns.filter(d => d.isLegalDelivery).length
  return {
    runs,
    wickets,
    overs: Math.floor(legalBalls / 6),
    balls: legalBalls % 6,
    legalBalls,
  }
}

function getBatsmanStats(deliveries, innings, name) {
  const faced = deliveries.filter(
    d => d.innings === innings && d.striker === name && d.extraType !== 'wide'
  )
  const runs = faced.reduce(
    (s, d) => (d.extraType === 'bye' || d.extraType === 'legbye' ? s : s + d.batRuns), 0
  )
  const fours = faced.filter(d => d.batRuns === 4 && !d.extraType).length
  const sixes = faced.filter(d => d.batRuns === 6 && !d.extraType).length
  return { runs, balls: faced.length, fours, sixes }
}

function getBowlerFigures(deliveries, innings, name) {
  const mine = deliveries.filter(d => d.innings === innings && d.bowler === name)
  const legalBalls = mine.filter(d => d.isLegalDelivery).length
  const runs = mine.reduce(
    (s, d) => (d.extraType === 'bye' || d.extraType === 'legbye' ? s : s + d.batRuns + d.extraRuns), 0
  )
  const wickets = mine.filter(
    d => d.wicket && d.wicket.type !== 'Run Out' && d.wicket.type !== 'Retired Hurt'
  ).length
  const overs = Math.floor(legalBalls / 6)
  const rem = legalBalls % 6
  return {
    overs: rem ? `${overs}.${rem}` : String(overs),
    runs,
    wickets,
    wides: mine.filter(d => d.extraType === 'wide').length,
    noBalls: mine.filter(d => d.extraType === 'noball').length,
  }
}

function getOverBalls(deliveries, innings, overNum) {
  return deliveries.filter(d => d.innings === innings && d.overNum === overNum)
}

// ─── Ball icon ────────────────────────────────────────────────────────────────

function Ball({ d }) {
  if (!d) return <span className="sc-ball sc-ball--empty" />
  if (d.wicket) return <span className="sc-ball sc-ball--wicket">W</span>
  if (d.extraType === 'wide') return <span className="sc-ball sc-ball--extra">Wd</span>
  if (d.extraType === 'noball') return <span className="sc-ball sc-ball--extra">nb</span>
  if (d.extraType === 'bye') return <span className="sc-ball sc-ball--extra">{d.extraRuns}b</span>
  if (d.extraType === 'legbye') return <span className="sc-ball sc-ball--extra">{d.extraRuns}lb</span>
  if (d.batRuns === 0) return <span className="sc-ball sc-ball--dot">·</span>
  if (d.batRuns === 4) return <span className="sc-ball sc-ball--four">4</span>
  if (d.batRuns === 6) return <span className="sc-ball sc-ball--six">6</span>
  return <span className="sc-ball">{d.batRuns}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_WICKET_FORM = { type: 'Bowled', fielder: '', outBatsman: '' }

export default function LiveScorecard({ matchData, deliveries, scorecardState, onChange }) {
  const {
    phase, innings, battingTeam, bowlingTeam,
    striker, nonStriker, currentBowler, overNum, legalBallsInOver,
  } = scorecardState

  // Derive initial uiMode from state (handles page refresh mid-prompt)
  const [uiMode, setUiMode] = useState(() => {
    if (phase === 'scoring') {
      if (!striker || !nonStriker) return 'newBatsman'
      if (!currentBowler) return 'newBowler'
    }
    return 'normal'
  })

  // Sync uiMode when scorecardState arrives from a load
  useEffect(() => {
    if (phase === 'scoring') {
      if (!striker || !nonStriker) { setUiMode('newBatsman'); return }
      if (!currentBowler) { setUiMode('newBowler'); return }
    }
  }, [phase, striker, nonStriker, currentBowler])

  const [pendingExtra, setPendingExtra] = useState(null) // 'bye' | 'legbye'
  const [wicketForm, setWicketForm] = useState(DEFAULT_WICKET_FORM)
  const [newBatsmanInput, setNewBatsmanInput] = useState('')
  const [newBowlerInput, setNewBowlerInput] = useState('')
  const [needBowlerAfterBatsman, setNeedBowlerAfterBatsman] = useState(false)

  const [setupForm, setSetupForm] = useState({
    battingTeam: matchData?.team1 || '',
    striker: '',
    nonStriker: '',
    bowler: '',
  })

  // Live computed values
  const score = useMemo(() => computeScore(deliveries, innings), [deliveries, innings])
  const score1 = useMemo(() => computeScore(deliveries, 1), [deliveries])
  const strikerStats = useMemo(() => getBatsmanStats(deliveries, innings, striker), [deliveries, innings, striker])
  const nonStrikerStats = useMemo(() => getBatsmanStats(deliveries, innings, nonStriker), [deliveries, innings, nonStriker])
  const bowlerFigs = useMemo(() => getBowlerFigures(deliveries, innings, currentBowler), [deliveries, innings, currentBowler])
  const overBalls = useMemo(() => getOverBalls(deliveries, innings, overNum), [deliveries, innings, overNum])

  // ─── Setup ─────────────────────────────────────────────────────────────────

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
        overNum: 0,
        legalBallsInOver: 0,
      },
    })
    setUiMode('normal')
  }

  // ─── Core delivery recording ────────────────────────────────────────────────

  const recordDelivery = ({ batRuns = 0, extraRuns = 0, extraType = null, wicket = null }) => {
    const isLegal = extraType !== 'wide' && extraType !== 'noball'
    const totalRuns = batRuns + extraRuns

    const delivery = {
      innings, overNum, bowler: currentBowler,
      striker, nonStriker, battingTeam, bowlingTeam,
      batRuns, extraRuns, extraType, totalRuns,
      isLegalDelivery: isLegal,
      wicket,
    }

    const newDeliveries = [...deliveries, delivery]

    // Strike rotation: odd runs → swap
    let newStriker = striker
    let newNonStriker = nonStriker
    if (totalRuns % 2 === 1) [newStriker, newNonStriker] = [newNonStriker, newStriker]

    // Wicket: vacate dismissed batsman's slot
    let batsmanOut = null
    if (wicket) {
      batsmanOut = wicket.outBatsman
      if (batsmanOut === newStriker) newStriker = ''
      else newNonStriker = ''
    }

    // Over completion
    let newLegal = legalBallsInOver
    let newOverNum = overNum
    let overComplete = false
    if (isLegal) {
      newLegal = legalBallsInOver + 1
      if (newLegal === 6) {
        overComplete = true
        newLegal = 0
        newOverNum = overNum + 1
        // End-of-over swap
        ;[newStriker, newNonStriker] = [newNonStriker, newStriker]
      }
    }

    // Check for innings end (10 wickets)
    const totalWickets = newDeliveries.filter(d => d.innings === innings && d.wicket).length
    if (totalWickets >= 10) {
      const newPhase = innings === 1 ? 'inningsBreak' : 'ended'
      onChange({
        deliveries: newDeliveries,
        scorecardState: {
          ...scorecardState, striker: newStriker, nonStriker: newNonStriker,
          overNum: newOverNum, legalBallsInOver: newLegal, phase: newPhase,
        },
      })
      setUiMode('normal')
      return
    }

    const newState = {
      ...scorecardState,
      striker: newStriker,
      nonStriker: newNonStriker,
      overNum: newOverNum,
      legalBallsInOver: newLegal,
    }
    onChange({ deliveries: newDeliveries, scorecardState: newState })

    // Prompt chain: batsman first, then bowler (if over also ended)
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

  const handleUndo = () => {
    if (!deliveries.length) return
    const prev = deliveries[deliveries.length - 1]
    if (prev.innings !== innings) return

    const trimmed = deliveries.slice(0, -1)
    const innsD = trimmed.filter(d => d.innings === innings)
    const legalTotal = innsD.filter(d => d.isLegalDelivery).length

    onChange({
      deliveries: trimmed,
      scorecardState: {
        ...scorecardState,
        striker: prev.striker,
        nonStriker: prev.nonStriker,
        currentBowler: prev.bowler,
        overNum: Math.floor(legalTotal / 6),
        legalBallsInOver: legalTotal % 6,
      },
    })
    setUiMode('normal')
  }

  const confirmNewBatsman = () => {
    const name = newBatsmanInput.trim()
    if (!name) return
    const newSt = scorecardState.striker || name
    const newNst = scorecardState.nonStriker || (scorecardState.striker ? name : nonStriker)
    onChange({
      deliveries,
      scorecardState: { ...scorecardState, striker: newSt, nonStriker: newSt === name ? newNst : name },
    })
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
    if (!name) return
    onChange({ deliveries, scorecardState: { ...scorecardState, currentBowler: name } })
    setNewBowlerInput('')
    setUiMode('normal')
  }

  const startSecondInnings = () => {
    setSetupForm({ battingTeam: bowlingTeam, striker: '', nonStriker: '', bowler: '' })
    onChange({
      deliveries,
      scorecardState: {
        ...scorecardState,
        phase: 'setup',
        innings: 2,
        battingTeam: bowlingTeam,
        bowlingTeam: battingTeam,
        striker: '', nonStriker: '', currentBowler: '',
        overNum: 0, legalBallsInOver: 0,
      },
    })
    setUiMode('normal')
  }

  const endMatch = () => {
    onChange({ deliveries, scorecardState: { ...scorecardState, phase: 'ended' } })
  }

  // ─── Setup phase ────────────────────────────────────────────────────────────

  if (phase === 'setup') {
    const teams = [matchData?.team1, matchData?.team2].filter(Boolean)
    const inningsNum = innings === 2 ? '2nd' : '1st'
    return (
      <div className="sc-setup">
        <h2>{inningsNum} Innings Setup</h2>
        {innings === 2 && (
          <div className="sc-setup__innings1">
            1st Innings: <strong>{score1.runs}/{score1.wickets}</strong>
            &nbsp;({score1.overs}.{score1.balls} ov)
          </div>
        )}
        <form onSubmit={submitSetup} className="sc-setup__form">
          <div className="form-group">
            <label>Batting Team</label>
            <select
              value={setupForm.battingTeam}
              onChange={e => setSetupForm(f => ({ ...f, battingTeam: e.target.value }))}
              required
            >
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Opener (on strike)</label>
            <input
              type="text" value={setupForm.striker} required
              placeholder="Batsman name"
              onChange={e => setSetupForm(f => ({ ...f, striker: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Opener (non-strike)</label>
            <input
              type="text" value={setupForm.nonStriker} required
              placeholder="Batsman name"
              onChange={e => setSetupForm(f => ({ ...f, nonStriker: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Opening Bowler</label>
            <input
              type="text" value={setupForm.bowler} required
              placeholder="Bowler name"
              onChange={e => setSetupForm(f => ({ ...f, bowler: e.target.value }))}
            />
          </div>
          <button type="submit" className="sc-btn sc-btn--primary">Start Innings</button>
        </form>
      </div>
    )
  }

  // ─── Innings break ──────────────────────────────────────────────────────────

  if (phase === 'inningsBreak') {
    return (
      <div className="sc-break">
        <h2>Innings Break</h2>
        <div className="sc-break__score">
          <span>{deliveries.find(d => d.innings === 1)?.battingTeam}</span>
          <span className="sc-break__runs">{score1.runs}/{score1.wickets}</span>
          <span className="sc-break__overs">({score1.overs}.{score1.balls} ov)</span>
        </div>
        <div className="sc-break__actions">
          <button className="sc-btn sc-btn--primary" onClick={startSecondInnings}>
            Start 2nd Innings
          </button>
          <button className="sc-btn sc-btn--secondary" onClick={endMatch}>
            End Match
          </button>
        </div>
      </div>
    )
  }

  // ─── Match ended ────────────────────────────────────────────────────────────

  if (phase === 'ended') {
    const score2 = computeScore(deliveries, 2)
    const bat1 = deliveries.find(d => d.innings === 1)?.battingTeam || ''
    const bat2 = deliveries.find(d => d.innings === 2)?.battingTeam || ''
    return (
      <div className="sc-break">
        <h2>Match Complete</h2>
        <div className="sc-break__score">
          <span>{bat1}</span>
          <span className="sc-break__runs">{score1.runs}/{score1.wickets}</span>
        </div>
        {score2.legalBalls > 0 && (
          <div className="sc-break__score">
            <span>{bat2}</span>
            <span className="sc-break__runs">{score2.runs}/{score2.wickets}</span>
          </div>
        )}
        <p className="sc-break__note">Check the View Statistics tab for full scorecard.</p>
      </div>
    )
  }

  // ─── Scoring phase ──────────────────────────────────────────────────────────

  const remainingSlots = Math.max(0, 6 - legalBallsInOver)

  return (
    <div className="sc-root">

      {/* ── Scoreboard ── */}
      <div className="sc-board">
        <div className="sc-board__team">{battingTeam} · Innings {innings}</div>
        <div className="sc-board__score">
          {score.runs}<span className="sc-board__sep">/</span>{score.wickets}
        </div>
        <div className="sc-board__overs">({score.overs}.{score.balls} ov)</div>
      </div>

      {/* ── Batsmen ── */}
      <div className="sc-batsmen">
        <div className="sc-batsman sc-batsman--striker">
          <div className="sc-batsman__name">{striker} <span className="sc-strike-dot">●</span></div>
          <div className="sc-batsman__score">
            {strikerStats.runs}
            <span className="sc-batsman__balls"> ({strikerStats.balls})</span>
          </div>
          <div className="sc-batsman__detail">
            SR {strikerStats.balls > 0 ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(0) : 0}
            &nbsp;&nbsp;{strikerStats.fours}×4&nbsp;{strikerStats.sixes}×6
          </div>
        </div>
        <div className="sc-batsman">
          <div className="sc-batsman__name">{nonStriker}</div>
          <div className="sc-batsman__score">
            {nonStrikerStats.runs}
            <span className="sc-batsman__balls"> ({nonStrikerStats.balls})</span>
          </div>
          <div className="sc-batsman__detail">
            SR {nonStrikerStats.balls > 0 ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(0) : 0}
            &nbsp;&nbsp;{nonStrikerStats.fours}×4&nbsp;{nonStrikerStats.sixes}×6
          </div>
        </div>
      </div>

      {/* ── Bowler + current over ── */}
      <div className="sc-over">
        <div className="sc-over__bowler">
          <span className="sc-over__name">{currentBowler}</span>
          <span className="sc-over__figs">
            {bowlerFigs.overs}-{bowlerFigs.wides}wd-{bowlerFigs.runs}-{bowlerFigs.wickets}
          </span>
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
                <button
                  key={r}
                  className={`sc-btn sc-btn--ball ${r === 4 ? 'sc-btn--four' : r === 6 ? 'sc-btn--six' : ''}`}
                  onClick={() => recordDelivery({ batRuns: r })}
                >
                  {r === 0 ? '·' : r}
                </button>
              ))}
              <button className="sc-btn sc-btn--ball sc-btn--wicket" onClick={() => {
                setWicketForm({ ...DEFAULT_WICKET_FORM, outBatsman: striker })
                setUiMode('wicket')
              }}>W</button>
            </div>

            <div className="sc-entry__label">Extras</div>
            <div className="sc-entry__row sc-entry__row--extras">
              <button className="sc-btn sc-btn--extra" onClick={() => recordDelivery({ extraRuns: 1, extraType: 'wide' })}>Wide</button>
              <button className="sc-btn sc-btn--extra" onClick={() => recordDelivery({ extraRuns: 1, extraType: 'noball' })}>No Ball</button>
              <button className="sc-btn sc-btn--extra" onClick={() => { setPendingExtra('bye'); setUiMode('extraRuns') }}>Bye</button>
              <button className="sc-btn sc-btn--extra" onClick={() => { setPendingExtra('legbye'); setUiMode('extraRuns') }}>Leg Bye</button>
            </div>

            <div className="sc-entry__actions">
              <button
                className="sc-btn sc-btn--undo"
                onClick={handleUndo}
                disabled={!deliveries.length || deliveries[deliveries.length - 1]?.innings !== innings}
              >
                ↩ Undo
              </button>
              <button className="sc-btn sc-btn--end" onClick={() => {
                if (innings === 1) onChange({ deliveries, scorecardState: { ...scorecardState, phase: 'inningsBreak' } })
                else endMatch()
              }}>
                {innings === 1 ? 'End Innings' : 'End Match'}
              </button>
            </div>
          </>
        )}

        {uiMode === 'extraRuns' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">
              {pendingExtra === 'bye' ? 'Bye' : 'Leg Bye'} — how many runs?
            </div>
            <div className="sc-entry__row">
              {[1, 2, 3, 4].map(r => (
                <button
                  key={r}
                  className="sc-btn sc-btn--ball"
                  onClick={() => { recordDelivery({ extraRuns: r, extraType: pendingExtra }); setPendingExtra(null) }}
                >{r}</button>
              ))}
            </div>
            <button className="sc-btn sc-btn--cancel" onClick={() => { setPendingExtra(null); setUiMode('normal') }}>Cancel</button>
          </div>
        )}

        {uiMode === 'wicket' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">Wicket!</div>
            <div className="form-group">
              <label>Dismissal</label>
              <select value={wicketForm.type} onChange={e => setWicketForm(f => ({ ...f, type: e.target.value }))}>
                {DISMISSAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {['Caught', 'Stumped', 'Run Out'].includes(wicketForm.type) && (
              <div className="form-group">
                <label>Fielder</label>
                <input
                  type="text" placeholder="Fielder name"
                  value={wicketForm.fielder}
                  onChange={e => setWicketForm(f => ({ ...f, fielder: e.target.value }))}
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
              <button className="sc-btn sc-btn--primary" onClick={() => {
                recordDelivery({ wicket: wicketForm })
                setUiMode('newBatsman')
              }}>Confirm Wicket</button>
              <button className="sc-btn sc-btn--cancel" onClick={() => setUiMode('normal')}>Cancel</button>
            </div>
          </div>
        )}

        {uiMode === 'newBatsman' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">New Batsman In</div>
            <input
              className="sc-prompt__input"
              type="text" autoFocus
              placeholder="Batsman name"
              value={newBatsmanInput}
              onChange={e => setNewBatsmanInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmNewBatsman()}
            />
            <button
              className="sc-btn sc-btn--primary"
              onClick={confirmNewBatsman}
              disabled={!newBatsmanInput.trim()}
            >Send In</button>
          </div>
        )}

        {uiMode === 'newBowler' && (
          <div className="sc-prompt">
            <div className="sc-prompt__title">Over {overNum + 1} — New Bowler</div>
            <input
              className="sc-prompt__input"
              type="text" autoFocus
              placeholder="Bowler name"
              value={newBowlerInput}
              onChange={e => setNewBowlerInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmNewBowler()}
            />
            <button
              className="sc-btn sc-btn--primary"
              onClick={confirmNewBowler}
              disabled={!newBowlerInput.trim()}
            >Start Over</button>
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
            const bowlerName = balls[0]?.bowler || ''
            return (
              <div key={ov} className="sc-history__row">
                <span className="sc-history__ov">Ov {ov + 1}</span>
                <span className="sc-history__bowler">{bowlerName}</span>
                <span className="sc-history__balls">
                  {balls.map((d, i) => <Ball key={i} d={d} />)}
                </span>
                <span className="sc-history__summary">
                  {ovRuns}{ovWkts > 0 ? `-${ovWkts}W` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
