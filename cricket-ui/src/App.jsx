import { useState, useEffect, useCallback, useMemo } from 'react'
import MatchDetails from './components/MatchDetails'
import LiveScorecard from './components/LiveScorecard'
import StatisticsView from './components/StatisticsView'
import SearchMatches from './components/SearchMatches'
import TeamsView from './components/TeamsView'
import LiveScores from './components/LiveScores'
import PlayerStats from './components/PlayerStats'
import { saveMatch as saveMatchToStorage } from './services/matchService'
import { loadTeams, loadPlayers } from './services/teamService'
import { supabase, isSupabaseConfigured, signOut } from './lib/supabase'
import { logger } from './lib/logger'
import AuthModal from './components/AuthModal'
import './App.css'

// ─── Derive batting stats from ball-by-ball deliveries ───────────────────────

export function deriveBattingStats(deliveries) {
  const playerMap = {}
  for (const d of deliveries) {
    if (d.isRetirement) continue
    const key = `${d.striker}|${d.innings}|${d.battingTeam}`
    if (!playerMap[key]) {
      playerMap[key] = {
        playerName: d.striker, team: d.battingTeam, innings: d.innings,
        runs: 0, balls: 0, fours: 0, sixes: 0,
        dismissalType: 'Not Out', bowler: '', fielder: '',
        timestamp: new Date().toISOString(),
      }
    }
    const p = playerMap[key]
    if (d.extraType !== 'bye' && d.extraType !== 'legbye') p.runs += d.batRuns
    if (d.batRuns === 4 && !d.extraType) p.fours++
    if (d.batRuns === 6 && !d.extraType) p.sixes++
    if (d.extraType !== 'wide') p.balls++
    if (d.wicket && d.wicket.outBatsman === d.striker) {
      p.dismissalType = d.wicket.type
      p.bowler = d.bowler
      p.fielder = d.wicket.fielder || ''
    }
  }
  return Object.values(playerMap).map(p => ({
    ...p,
    strikeRate: p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(2) : '0.00',
  }))
}

// ─── Derive bowling stats from ball-by-ball deliveries ────────────────────────

export function deriveBowlingStats(deliveries) {
  const bowlerMap = {}
  const overMap = {}

  for (const d of deliveries) {
    const bkey = `${d.bowler}|${d.innings}|${d.bowlingTeam}`
    if (!bowlerMap[bkey]) {
      bowlerMap[bkey] = {
        playerName: d.bowler, team: d.bowlingTeam, innings: d.innings,
        legalBalls: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0, maidens: 0,
      }
    }
    const b = bowlerMap[bkey]
    const runsCharged = d.extraType === 'bye' || d.extraType === 'legbye'
      ? 0
      : d.batRuns + d.extraRuns
    if (d.isLegalDelivery) b.legalBalls++
    b.runs += runsCharged
    if (d.extraType === 'wide') b.wides++
    if (d.extraType === 'noball') b.noBalls++
    if (d.wicket && d.wicket.type !== 'Run Out' && d.wicket.type !== 'Retired Hurt') b.wickets++

    const okey = `${d.bowler}|${d.innings}|${d.overNum}`
    if (!overMap[okey]) overMap[okey] = { bkey, legalBalls: 0, runs: 0 }
    if (d.isLegalDelivery) overMap[okey].legalBalls++
    overMap[okey].runs += runsCharged
  }

  for (const { bkey, legalBalls, runs } of Object.values(overMap)) {
    if (legalBalls === 6 && runs === 0) bowlerMap[bkey].maidens++
  }

  return Object.values(bowlerMap).map(b => {
    const overs = Math.floor(b.legalBalls / 6)
    const rem = b.legalBalls % 6
    const economy = b.legalBalls > 0 ? (b.runs / (b.legalBalls / 6)).toFixed(2) : '0.00'
    return {
      playerName: b.playerName, team: b.team, innings: b.innings,
      overs: rem ? `${overs}.${rem}` : String(overs),
      maidens: b.maidens,
      runs: b.runs,
      wickets: b.wickets,
      economy,
      average: b.wickets > 0 ? (b.runs / b.wickets).toFixed(2) : 'N/A',
      strikeRate: b.wickets > 0 ? (b.legalBalls / b.wickets).toFixed(2) : 'N/A',
      wides: b.wides,
      noBalls: b.noBalls,
      timestamp: new Date().toISOString(),
    }
  })
}

const DEFAULT_SCORECARD_STATE = {
  phase: 'setup',
  innings: 1,
  battingTeam: '',
  bowlingTeam: '',
  striker: '',
  nonStriker: '',
  currentBowler: '',
  overNum: 0,
  legalBallsInOver: 0,
  followOnTaken: false,
  matchResult: '',
  isFreeHit: false,
}

function App() {
  const [matchData, setMatchData] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [scorecardState, setScorecardState] = useState(DEFAULT_SCORECARD_STATE)
  const [currentView, setCurrentView] = useState('match')
  const [currentMatchId, setCurrentMatchId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [session, setSession] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [teams, setTeams] = useState([])
  const [squad, setSquad] = useState({})

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Load teams whenever session is established
  useEffect(() => {
    if (!isSupabaseConfigured() || !session) return
    loadTeams().then(setTeams)
  }, [session])

  // Load squad players when matchData teams change
  useEffect(() => {
    if (!matchData || !teams.length) return
    const load = async () => {
      const t1 = teams.find(t => t.id === matchData.team1Id || t.name === matchData.team1)
      const t2 = teams.find(t => t.id === matchData.team2Id || t.name === matchData.team2)
      const next = {}
      if (t1) next[matchData.team1] = await loadPlayers(t1.id)
      if (t2) next[matchData.team2] = await loadPlayers(t2.id)
      setSquad(next)
    }
    load()
  }, [matchData, teams])

  const battingStats = useMemo(() => deriveBattingStats(deliveries), [deliveries])
  const bowlingStats = useMemo(() => deriveBowlingStats(deliveries), [deliveries])

  const saveMatch = useCallback(async () => {
    if (!matchData) return
    setIsSaving(true)
    try {
      const makeId = () => {
        if (currentMatchId) return currentMatchId
        return (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `match-${Date.now()}`
      }
      const matchToSave = {
        id: makeId(),
        matchData,
        battingStats,
        bowlingStats,
        deliveries,
        scorecardState,
        lastUpdated: new Date().toISOString(),
      }
      const savedId = await saveMatchToStorage(matchToSave)
      if (savedId && !currentMatchId) setCurrentMatchId(savedId)
      setJustSaved(true)
    } catch (error) {
      logger.error('match.save_failed', { error, currentMatchId })
    } finally {
      setIsSaving(false)
    }
  }, [matchData, battingStats, bowlingStats, deliveries, scorecardState, currentMatchId])

  // Clear the "Saved" confirmation a few seconds after it appears
  useEffect(() => {
    if (!justSaved) return
    const id = setTimeout(() => setJustSaved(false), 2500)
    return () => clearTimeout(id)
  }, [justSaved])

  useEffect(() => {
    if (matchData && deliveries.length > 0) {
      const id = setTimeout(saveMatch, 1000)
      return () => clearTimeout(id)
    }
  }, [matchData, deliveries, scorecardState, saveMatch])

  const handleLoadMatch = (match) => {
    setMatchData(match.matchData)
    setDeliveries(match.deliveries || [])
    setScorecardState(match.scorecardState || DEFAULT_SCORECARD_STATE)
    setCurrentMatchId(match.id)
    setCurrentView('scorecard')
  }

  const handleMatchSubmit = (data) => {
    setMatchData(data)
    setScorecardState({ ...DEFAULT_SCORECARD_STATE, battingTeam: data.team1 || '' })
    setCurrentView('scorecard')
  }

  const handleScorecardChange = ({ deliveries: newDeliveries, scorecardState: newState }) => {
    setDeliveries(newDeliveries)
    setScorecardState(newState)
  }

  const resetAll = () => {
    setMatchData(null)
    setDeliveries([])
    setScorecardState(DEFAULT_SCORECARD_STATE)
    setCurrentMatchId(null)
    setCurrentView('match')
  }

  const handleAuthSuccess = (s) => { setSession(s); setShowAuthModal(false) }
  const handleLogout = async () => { await signOut(); setSession(null) }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏏 Cricket Statistics Tracker</h1>
        <div className="storage-status">
          {isSupabaseConfigured() ? (
            session
              ? <span className="status-online" title="Connected to Supabase">☁️ Cloud Storage Active</span>
              : <span className="status-offline" title="Sign in to sync to cloud">🔒 Sign In to Sync</span>
          ) : (
            <span className="status-offline" title="Using local storage only">💾 Local Storage Only</span>
          )}
          {isSaving && <span className="saving-indicator">Saving...</span>}
          {!isSaving && justSaved && <span className="saved-indicator">Saved ✓</span>}
        </div>

        {isSupabaseConfigured() && !session && (
          <div className="auth-header-actions">
            <button className="sign-in-btn" onClick={() => setShowAuthModal(true)}>Sign In</button>
          </div>
        )}
        {isSupabaseConfigured() && session && (
          <div className="auth-header-actions">
            <button className="sign-out-btn" onClick={handleLogout}>Sign Out</button>
          </div>
        )}

        <nav className="nav-tabs">
          <button className={currentView === 'match' ? 'active' : ''} onClick={() => setCurrentView('match')}>Match</button>
          <button className={currentView === 'scorecard' ? 'active' : ''} onClick={() => setCurrentView('scorecard')} disabled={!matchData}>Scorecard</button>
          <button className={currentView === 'view' ? 'active' : ''} onClick={() => setCurrentView('view')} disabled={!matchData}>Statistics</button>
          <button className={currentView === 'teams' ? 'active' : ''} onClick={() => setCurrentView('teams')}>Teams</button>
          <button className={currentView === 'search' ? 'active' : ''} onClick={() => setCurrentView('search')}>Search</button>
          <button className={currentView === 'live' ? 'active' : ''} onClick={() => setCurrentView('live')}>Live</button>
          <button className={currentView === 'playerstats' ? 'active' : ''} onClick={() => setCurrentView('playerstats')}>Players</button>
        </nav>
      </header>

      <main className="app-main">
        {/* Onboarding hint for first-time users */}
        {currentView === 'match' && !matchData && (
          <div className="app-onboarding">
            <span className="app-onboarding__icon">🏏</span>
            <span className="app-onboarding__text">
              {isSupabaseConfigured() && !session
                ? 'Sign in to load saved teams, or type team names below to score right now — no account needed.'
                : 'Fill in the match details below to start scoring. Visit Teams to create squads for player auto-complete.'}
            </span>
          </div>
        )}

        {/* Progress strip when in scorecard view */}
        {matchData && currentView === 'scorecard' && (
          <div className="app-progress">
            <span className={`app-progress__step${scorecardState.phase !== 'setup' ? ' app-progress__step--done' : ' app-progress__step--active'}`}>
              {scorecardState.phase !== 'setup' ? '✓ ' : ''}Innings Setup
            </span>
            <span className="app-progress__sep">›</span>
            <span className={`app-progress__step${
              scorecardState.phase === 'scoring' || scorecardState.phase === 'inningsBreak' ? ' app-progress__step--active' :
              scorecardState.phase === 'ended' ? ' app-progress__step--done' : ''}`}>
              {scorecardState.phase === 'ended' ? '✓ ' : ''}Scoring
            </span>
            <span className="app-progress__sep">›</span>
            <span className={`app-progress__step${scorecardState.phase === 'ended' ? ' app-progress__step--active' : ''}`}>
              Complete
            </span>
          </div>
        )}

        {currentView === 'match' && (
          <MatchDetails onSubmit={handleMatchSubmit} matchData={matchData} teams={teams} session={session} />
        )}
        {currentView === 'scorecard' && (
          <LiveScorecard
            matchData={matchData}
            deliveries={deliveries}
            scorecardState={scorecardState}
            onChange={handleScorecardChange}
            squad={squad}
          />
        )}
        {currentView === 'teams' && (
          <TeamsView onTeamsChanged={setTeams} />
        )}
        {currentView === 'view' && (
          <StatisticsView
            matchData={matchData}
            battingStats={battingStats}
            bowlingStats={bowlingStats}
            deliveries={deliveries}
            onReset={resetAll}
            onSave={saveMatch}
            onViewScorecard={() => setCurrentView('scorecard')}
          />
        )}
        {currentView === 'search' && (
          <SearchMatches onLoadMatch={handleLoadMatch} session={session} />
        )}
        {currentView === 'live' && (
          <LiveScores />
        )}
        {currentView === 'playerstats' && (
          <PlayerStats />
        )}
      </main>

      {showAuthModal && (
        <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  )
}

export default App
