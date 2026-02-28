import { useState, useEffect, useCallback } from 'react'
import MatchDetails from './components/MatchDetails'
import BattingStats from './components/BattingStats'
import BowlingStats from './components/BowlingStats'
import StatisticsView from './components/StatisticsView'
import SearchMatches from './components/SearchMatches'
import { saveMatch as saveMatchToStorage } from './services/matchService'
import { clearToken, getToken, isApiConfigured, login as apiLogin } from './lib/apiClient'
import { logger } from './lib/logger'
import './App.css'

function App() {
  const [matchData, setMatchData] = useState(null)
  const [battingStats, setBattingStats] = useState([])
  const [bowlingStats, setBowlingStats] = useState([])
  const [currentView, setCurrentView] = useState('match')
  const [currentMatchId, setCurrentMatchId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [token, setToken] = useState(() => (isApiConfigured() ? getToken() : null))
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState(null)

  const saveMatch = useCallback(async () => {
    if (!matchData) return
    
    setIsSaving(true)
    try {
      const makeId = () => {
        if (currentMatchId) return currentMatchId
        if (isApiConfigured()) {
          return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `match-${Date.now()}`
        }
        return `match-${Date.now()}`
      }
      const matchToSave = {
        id: makeId(),
        matchData,
        battingStats,
        bowlingStats,
        lastUpdated: new Date().toISOString()
      }

      const savedId = await saveMatchToStorage(matchToSave)
      
      if (savedId && !currentMatchId) {
        setCurrentMatchId(savedId)
      }
    } catch (error) {
      logger.error('match.save_failed', { error, currentMatchId })
    } finally {
      setIsSaving(false)
    }
  }, [matchData, battingStats, bowlingStats, currentMatchId])

  // Save match to storage whenever data changes
  useEffect(() => {
    if (matchData && (battingStats.length > 0 || bowlingStats.length > 0)) {
      // Debounce saves to avoid too many requests
      const timeoutId = setTimeout(() => {
        saveMatch()
      }, 1000) // Wait 1 second after last change

      return () => clearTimeout(timeoutId)
    }
  }, [matchData, battingStats, bowlingStats, saveMatch])

  const handleLoadMatch = (match) => {
    setMatchData(match.matchData)
    setBattingStats(match.battingStats || [])
    setBowlingStats(match.bowlingStats || [])
    setCurrentMatchId(match.id)
    setCurrentView('view')
  }

  const handleMatchSubmit = (data) => {
    setMatchData(data)
    // Don't set ID here - let Supabase generate it or use existing UUID
    // currentMatchId will be set after first save
    setCurrentView('batting')
  }

  const handleBattingSubmit = (stats) => {
    setBattingStats([...battingStats, stats])
  }

  const handleBowlingSubmit = (stats) => {
    setBowlingStats([...bowlingStats, stats])
  }

  const resetAll = () => {
    setMatchData(null)
    setBattingStats([])
    setBowlingStats([])
    setCurrentMatchId(null)
    setCurrentView('match')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError(null)
    try {
      const t = await apiLogin(loginUsername, loginPassword)
      setToken(t)
      setLoginPassword('')
    } catch (error) {
      logger.error('auth.login_failed', { error })
      setLoginError('Login failed')
    }
  }

  const handleLogout = () => {
    clearToken()
    setToken(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏏 Cricket Statistics Tracker</h1>
        <div className="storage-status">
          {isApiConfigured() ? (
            token ? (
              <span className="status-online" title="Connected to API">
                ☁️ API Storage Active
              </span>
            ) : (
              <span className="status-offline" title="API configured but not logged in">
                🔒 Login Required
              </span>
            )
          ) : (
            <span className="status-offline" title="Using local storage only">
              💾 Local Storage Only
            </span>
          )}
          {isSaving && <span className="saving-indicator">Saving...</span>}
        </div>

        {isApiConfigured() && !token && (
          <form onSubmit={handleLogin} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)' }}
            />
            <button type="submit" style={{ padding: '8px 12px', borderRadius: 6 }}>
              Login
            </button>
            {loginError && <span role="alert" style={{ marginLeft: 8 }}>{loginError}</span>}
          </form>
        )}

        {isApiConfigured() && token && (
          <div style={{ marginTop: 8 }}>
            <button onClick={handleLogout} style={{ padding: '6px 10px', borderRadius: 6 }}>
              Logout
            </button>
          </div>
        )}

        <nav className="nav-tabs">
          <button 
            className={currentView === 'match' ? 'active' : ''}
            onClick={() => setCurrentView('match')}
          >
            Match Details
          </button>
          <button 
            className={currentView === 'batting' ? 'active' : ''}
            onClick={() => setCurrentView('batting')}
            disabled={!matchData}
          >
            Batting Stats
          </button>
          <button 
            className={currentView === 'bowling' ? 'active' : ''}
            onClick={() => setCurrentView('bowling')}
            disabled={!matchData}
          >
            Bowling Stats
          </button>
          <button 
            className={currentView === 'view' ? 'active' : ''}
            onClick={() => setCurrentView('view')}
            disabled={!matchData}
          >
            View Statistics
          </button>
          <button 
            className={currentView === 'search' ? 'active' : ''}
            onClick={() => setCurrentView('search')}
          >
            Search Matches
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'match' && (
          <MatchDetails onSubmit={handleMatchSubmit} matchData={matchData} />
        )}
        {currentView === 'batting' && (
          <BattingStats 
            onSubmit={handleBattingSubmit} 
            existingStats={battingStats}
          />
        )}
        {currentView === 'bowling' && (
          <BowlingStats 
            onSubmit={handleBowlingSubmit} 
            existingStats={bowlingStats}
          />
        )}
        {currentView === 'view' && (
          <StatisticsView 
            matchData={matchData}
            battingStats={battingStats}
            bowlingStats={bowlingStats}
            onReset={resetAll}
            onSave={saveMatch}
          />
        )}
        {currentView === 'search' && (
          <SearchMatches onLoadMatch={handleLoadMatch} />
        )}
      </main>
    </div>
  )
}

export default App

