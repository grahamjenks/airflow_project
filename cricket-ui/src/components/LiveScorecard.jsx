import { useState, useMemo, useEffect } from 'react'
import './LiveScorecard.css'

const DISMISSAL_TYPES = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket', 'Retired Hurt']

const ordinal = n => ['1st', '2nd', '3rd', '4th'][n - 1] || `${n}th`

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
    (s, d) => (d.extraType === 'bye' || d.extraType === 'legbye' ? s : s + d.batRuns + d.extraRuns), 0
  )
  const wickets = mine.filter(
    d => d.wicket && d.wicket.type !== 'Run Out' && d.wicket.type !== 'Retired Hurt'
  ).length
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
              <option key={n} value={n}>
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

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_WICKET_FORM = { type: 'Bowled', fielder: '', outBatsman: '' }
const DEFAULT_RETIRE_FORM = { batter: 'striker', type: 'Hurt' }

export default function LiveScorecard({ matchData, deliveries, scorecardState, onChange, squad = {} }) {
  const {
    phase, innings, battingTeam, bowlingTeam,
    striker, nonStriker, currentBowler, overNum, legalBallsInOver,
    followOnTaken, matchResult, retiredBatters = [],
  } = scorecardState

  const isTestFormat = matchData?.format === 'Test' || matchData?.matchType === 'Test' || matchData?.matchType === 'First Class'
  const maxOvers = isTestFormat ? Infinity : (matchData?.overs || 20)
  const maxInnings = isTestFormat ? 4 : 2
  const followOnThreshold = matchData?.matchType === 'First Class' ? 150 : 200

  const [setupForm, setSetupForm] = useState({
    battingTeam: matchData?.team1 || '',
    striker: '', nonStriker: '', bowler: '',
  })

  const sqBattingTeam = battingTeam || setupForm.battingTeam
  const sqBowlingTeam = bowlingTeam || (sqBattingTeam === matchData?.team1 ? matchData?.team2 : matchData?.team1)
  const batterNames = (squad[sqBattingTeam] || []).map(p => p.name)
  const bowlerNames = (squad[sqBowlingTeam] || [])
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

  // Bowlers grouped by role for the new-bowler picker
  const bowlerGroups = useMemo(() => {
    const sqd = squad[sqBowlingTeam] || []
    if (!sqd.length) return null
    const pinnedSet = new Set(recentBowlerPins)
    const groups = []
    if (recentBowlerPins.length > 0) groups.push({ label: 'Recent', names: recentBowlerPins })
    const specialists = sqd.filter(p => (p.role === 'Bowler' || p.role === 'All-rounder') && !pinnedSet.has(p.name)).map(p => p.name)
    const others = sqd.filter(p => p.role !== 'Bowler' && p.role !== 'All-rounder' && !pinnedSet.has(p.name)).map(p => p.name)
    if (specialists.length) groups.push({ label: 'Bowlers & All-rounders', names: specialists })
    if (others.length) groups.push({ label: 'Batters', names: others })
    return groups.length ? groups : null
  }, [squad, sqBowlingTeam, recentBowlerPins])

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
  const isChasingInnings = innings === maxInnings

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

    const delivery = {
      innings, overNum, bowler: currentBowler,
      striker, nonStriker, battingTeam, bowlingTeam,
      batRuns, extraRuns, extraType, totalRuns, isLegalDelivery: isLegal, wicket,
    }

    const newDeliveries = [...deliveries, delivery]
    const newScore = computeScore(newDeliveries, innings)

    // Win by wickets in chasing innings
    if (isChasingInnings && target !== null) {
      const wicketsInInnings = newDeliveries.filter(d => d.innings === innings && d.wicket).length
      const wicketsRemaining = 10 - wicketsInInnings
      if (newScore.runs >= target) {
        const result = `${battingTeam} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`
        onChange({ deliveries: newDeliveries, scorecardState: { ...scorecardState, phase: 'ended', matchResult: result } })
        setUiMode('normal')
        return
      }
    }

    let newStriker = striker
    let newNonStriker = nonStriker
    if (totalRuns % 2 === 1) [newStriker, newNonStriker] = [newNonStriker, newStriker]

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
              phase: 'ended',
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
            phase: 'ended', matchResult: result,
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
          phase: 'inningsBreak',
        },
      })
      setUiMode('normal')
      return
    }

    onChange({
      deliveries: newDeliveries,
      scorecardState: { ...scorecardState, striker: newStriker, nonStriker: newNonStriker, overNum: newOverNum, legalBallsInOver: newLegal },
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
            <PlayerPicker names={setupBatterNames} value={setupForm.striker} onChange={v => setSetupForm(f => ({ ...f, striker: v }))} placeholder="Select opener…" className="sc-setup__input" />
          </div>
          <div className="form-group">
            <label>Opener (non-strike)</label>
            <PlayerPicker names={setupBatterNames} value={setupForm.nonStriker} onChange={v => setSetupForm(f => ({ ...f, nonStriker: v }))} placeholder="Select opener…" className="sc-setup__input" />
          </div>
          <div className="form-group">
            <label>Opening Bowler</label>
            <PlayerPicker names={setupBowlerNames} groups={setupBowlerGroups} value={setupForm.bowler} onChange={v => setSetupForm(f => ({ ...f, bowler: v }))} placeholder="Select bowler…" className="sc-setup__input" />
          </div>
          <button type="submit" className="sc-btn sc-btn--primary" disabled={!setupForm.striker.trim() || !setupForm.nonStriker.trim() || !setupForm.bowler.trim()}>
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
      {/* ── Scoreboard ── */}
      <div className="sc-board">
        <div className="sc-board__team">{battingTeam} · {ordinal(innings)} Innings</div>
        <div className="sc-board__score">
          {score.runs}<span className="sc-board__sep">/</span>{score.wickets}
        </div>
        <div className="sc-board__overs">
          ({score.overs}.{score.balls} ov{!isTestFormat && ballsRemaining !== null ? ` · ${ballsRemaining} balls rem` : ''})
        </div>
        {isChasingInnings && target !== null && target > 0 && (
          <div className="sc-board__target">
            <span>Target {target}</span>
            <span>Need {required}</span>
            {rrr && <span>RRR {rrr}</span>}
            {ballsRemaining !== null && <span>{ballsRemaining} balls</span>}
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
            </div>

            <div className="sc-entry__actions">
              <button className="sc-btn sc-btn--undo" onClick={handleUndo} disabled={!deliveries.length || deliveries[deliveries.length - 1]?.innings !== innings}>↩ Undo</button>
              <button className="sc-btn sc-btn--retire" onClick={() => { setRetireForm(DEFAULT_RETIRE_FORM); setUiMode('retireBatsman') }}>Retire</button>
              <button className="sc-btn sc-btn--end" onClick={handleEndInnings}>{endBtnLabel}</button>
            </div>
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
            <div className="sc-prompt__subtitle">+1 no-ball penalty added automatically</div>
            <div className="sc-entry__row">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  className={`sc-btn sc-btn--ball${r === 4 ? ' sc-btn--four' : r === 6 ? ' sc-btn--six' : ''}`}
                  onClick={() => { recordDelivery({ batRuns: r, extraRuns: 1, extraType: 'noball' }); setUiMode('normal') }}
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
                <input type="text" placeholder="Fielder name" value={wicketForm.fielder} onChange={e => setWicketForm(f => ({ ...f, fielder: e.target.value }))} />
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
              <button className="sc-btn sc-btn--primary" onClick={() => { recordDelivery({ wicket: wicketForm }); setUiMode('newBatsman') }}>Confirm Wicket</button>
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
            {prevOverBowler && (
              <div className="sc-prompt__note">{prevOverBowler} cannot bowl consecutive overs</div>
            )}
            <PlayerPicker
              names={bowlerNames}
              groups={bowlerGroups}
              value={newBowlerInput}
              onChange={setNewBowlerInput}
              placeholder="Select bowler…"
              disabledNames={prevOverBowler ? [prevOverBowler] : []}
            />
            <button
              className="sc-btn sc-btn--primary"
              onClick={confirmNewBowler}
              disabled={!newBowlerInput.trim() || newBowlerInput === prevOverBowler}
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
            return (
              <div key={ov} className="sc-history__row">
                <span className="sc-history__ov">Ov {ov + 1}</span>
                <span className="sc-history__bowler">{balls[0]?.bowler || ''}</span>
                <span className="sc-history__balls">{balls.map((d, i) => <Ball key={i} d={d} />)}</span>
                <span className="sc-history__summary">{ovRuns}{ovWkts > 0 ? `-${ovWkts}W` : ''}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
