import { useState, useEffect } from 'react'
import { loadMatches, deleteMatch as deleteMatchFromStorage } from '../services/matchService'
import { logger } from '../lib/logger'
import './SearchMatches.css'

function SearchMatches({ onLoadMatch, session }) {
  const [matches, setMatches] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterFormat, setFilterFormat] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    loadMatchesData()
  }, [])

  const loadMatchesData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const loadedMatches = await loadMatches()
      setMatches(Array.isArray(loadedMatches) ? loadedMatches : [])
    } catch (error) {
      logger.error('matches.load_failed', { error })
      setLoadError('Failed to load matches. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const deleteMatch = async (matchId) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        await deleteMatchFromStorage(matchId)
        setMatches(matches.filter(m => m.id !== matchId))
      } catch (error) {
        logger.error('match.delete_failed', { error, matchId })
        alert('Failed to delete match. Please try again.')
      }
    }
  }

  const filteredAndSortedMatches = matches
    .filter(match => {
      // Search filter
      const query = searchQuery.toLowerCase()
      const md = match?.matchData || {}
      const batting = Array.isArray(match?.battingStats) ? match.battingStats : []
      const bowling = Array.isArray(match?.bowlingStats) ? match.bowlingStats : []

      const matchesSearch = !query ||
        String(md.team1 || '').toLowerCase().includes(query) ||
        String(md.team2 || '').toLowerCase().includes(query) ||
        String(md.venue || '').toLowerCase().includes(query) ||
        String(md.matchType || '').toLowerCase().includes(query) ||
        batting.some(stat => String(stat?.playerName || '').toLowerCase().includes(query)) ||
        bowling.some(stat => String(stat?.playerName || '').toLowerCase().includes(query))

      // Type filter
      const matchesType = filterType === 'all' || md.matchType === filterType

      // Format filter
      const matchesFormat = filterFormat === 'all' || md.format === filterFormat

      return matchesSearch && matchesType && matchesFormat
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b?.matchData?.date || 0) - new Date(a?.matchData?.date || 0)
        case 'date-asc':
          return new Date(a?.matchData?.date || 0) - new Date(b?.matchData?.date || 0)
        case 'team-asc':
          return String(a?.matchData?.team1 || '').localeCompare(String(b?.matchData?.team1 || ''))
        case 'venue-asc':
          return String(a?.matchData?.venue || '').localeCompare(String(b?.matchData?.venue || ''))
        default:
          return 0
      }
    })

  const getUniqueMatchTypes = () => {
    const types = [...new Set(matches.map(m => m.matchData.matchType))].filter(Boolean)
    return types.sort()
  }

  const getUniqueFormats = () => {
    const formats = [...new Set(matches.map(m => m.matchData.format))].filter(Boolean)
    return formats.sort()
  }

  return (
    <div className="search-matches">
      <h2>Search Previous Matches</h2>

      {loadError && (
        <div className="no-results" role="alert">
          <p>{loadError}</p>
          <button className="action-button load-button" onClick={loadMatchesData}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading-matches">
          <p>Loading matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="no-matches">
          <p>No saved matches found. Create a new match to get started!</p>
        </div>
      ) : (
        <>
          <div className="search-filters">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by team, venue, player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="filterType">Match Type</label>
                <select
                  id="filterType"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {getUniqueMatchTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filterFormat">Format</label>
                <select
                  id="filterFormat"
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                >
                  <option value="all">All Formats</option>
                  {getUniqueFormats().map(format => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="sortBy">Sort By</label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date-desc">Date (Newest First)</option>
                  <option value="date-asc">Date (Oldest First)</option>
                  <option value="team-asc">Team (A-Z)</option>
                  <option value="venue-asc">Venue (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="results-count">
              Showing {filteredAndSortedMatches.length} of {matches.length} matches
            </div>
          </div>

          <div className="matches-grid">
            {filteredAndSortedMatches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="match-card-header">
                  <div className="match-title">
                    <h3>{match.matchData.team1} vs {match.matchData.team2}</h3>
                    <div className="match-badges">
                      <span className="badge badge-type">{match.matchData.matchType}</span>
                      <span className="badge badge-format">{match.matchData.format}</span>
                    </div>
                  </div>
                  <div className="match-actions">
                    <button
                      onClick={() => onLoadMatch(match)}
                      className="action-button load-button"
                      title="Load Match"
                    >
                      Load
                    </button>
                    {session && (
                      <button
                        onClick={() => deleteMatch(match.id)}
                        className="action-button delete-button"
                        title="Delete Match"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="match-card-body">
                  <div className="match-info-row">
                    <div><strong>Venue:</strong> {match.matchData.venue}</div>
                    <div><strong>Date:</strong> {new Date(match.matchData.date).toLocaleDateString()}</div>
                  </div>

                  {match.matchData.tossWinner && (
                    <div className="match-info-row">
                      <div>
                        <strong>Toss:</strong> {match.matchData.tossWinner} won and chose to {match.matchData.tossDecision?.toLowerCase()}
                      </div>
                    </div>
                  )}

                  <div className="match-stats-summary">
                    <div className="stat-item">
                      <span className="stat-label">Batting Stats:</span>
                      <span className="stat-value">{match.battingStats.length} entries</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Bowling Stats:</span>
                      <span className="stat-value">{match.bowlingStats.length} entries</span>
                    </div>
                    {match.battingStats.length > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Total Runs:</span>
                        <span className="stat-value">
                          {match.battingStats.reduce((sum, stat) => sum + parseInt(stat.runs || 0), 0)}
                        </span>
                      </div>
                    )}
                    {match.bowlingStats.length > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">Total Wickets:</span>
                        <span className="stat-value">
                          {match.bowlingStats.reduce((sum, stat) => sum + parseInt(stat.wickets || 0), 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAndSortedMatches.length === 0 && (
            <div className="no-results">
              <p>No matches found matching your search criteria.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SearchMatches

