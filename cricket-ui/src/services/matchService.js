import { logger } from '../lib/logger'
import { api, isApiConfigured, getToken } from '../lib/apiClient'

/**
 * Match Service - Handles all match data operations
 * Falls back to localStorage if API is not configured / unavailable
 */

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

// Load all matches
export const loadMatches = async () => {
  if (isApiConfigured() && getToken()) {
    try {
      const data = await api.listMatches()
      return (Array.isArray(data) ? data : []).map(match => ({
        id: match.id,
        matchData: match.matchData,
        battingStats: match.battingStats || [],
        bowlingStats: match.bowlingStats || [],
        lastUpdated: match.updated_at || match.created_at
      }))
    } catch (error) {
      logger.error('storage.api.load_matches_failed', { error })
      return loadMatchesFromLocalStorage()
    }
  }

  return loadMatchesFromLocalStorage()
}

// Save a match (create or update)
export const saveMatch = async (match) => {
  if (isApiConfigured() && getToken()) {
    try {
      const payload = {
        id: isUuid(match.id) ? match.id : undefined,
        matchData: match.matchData,
        battingStats: match.battingStats || [],
        bowlingStats: match.bowlingStats || [],
      }

      if (isUuid(match.id)) {
        const updated = await api.updateMatch(match.id, payload)
        return updated?.id || match.id
      }

      const created = await api.createMatch(payload)
      return created?.id || saveMatchToLocalStorage(match)
    } catch (error) {
      logger.error('storage.api.save_match_failed', { error, matchId: match?.id })
      return saveMatchToLocalStorage(match)
    }
  }

  return saveMatchToLocalStorage(match)
}

// Delete a match
export const deleteMatch = async (matchId) => {
  if (isApiConfigured() && getToken() && isUuid(matchId)) {
    try {
      await api.deleteMatch(matchId)
      return true
    } catch (error) {
      logger.error('storage.api.delete_match_failed', { error, matchId })
      return deleteMatchFromLocalStorage(matchId)
    }
  }

  return deleteMatchFromLocalStorage(matchId)
}

// Load a single match by ID
export const loadMatchById = async (matchId) => {
  if (isApiConfigured() && getToken() && isUuid(matchId)) {
    try {
      const data = await api.getMatch(matchId)
      return {
        id: data.id,
        matchData: data.matchData,
        battingStats: data.battingStats || [],
        bowlingStats: data.bowlingStats || [],
        lastUpdated: data.updated_at || data.created_at,
      }
    } catch (error) {
      logger.error('storage.api.load_match_failed', { error, matchId })
      return loadMatchFromLocalStorage(matchId)
    }
  }

  return loadMatchFromLocalStorage(matchId)
}

// ==================== localStorage Fallback Functions ====================

const loadMatchesFromLocalStorage = () => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    const parsed = savedMatches ? JSON.parse(savedMatches) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logger.error('storage.localStorage.load_failed', { error })
    return []
  }
}

const saveMatchToLocalStorage = (match) => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    let matches = savedMatches ? JSON.parse(savedMatches) : []
    if (!Array.isArray(matches)) matches = []

    if (match.id && !match.id.startsWith('match-')) {
      // Update existing match
      matches = matches.map(m => m.id === match.id ? match : m)
      localStorage.setItem('cricket-matches', JSON.stringify(matches))
      return match.id
    } else {
      // Add new match
      const id = match.id || `match-${Date.now()}`
      const newMatch = {
        ...match,
        id
      }
      matches.push(newMatch)
      localStorage.setItem('cricket-matches', JSON.stringify(matches))
      return newMatch.id
    }
  } catch (error) {
    logger.error('storage.localStorage.save_failed', { error })
    return null
  }
}

const deleteMatchFromLocalStorage = (matchId) => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    if (savedMatches) {
      const matches = JSON.parse(savedMatches)
      const filtered = (Array.isArray(matches) ? matches : []).filter(m => m?.id !== matchId)
      localStorage.setItem('cricket-matches', JSON.stringify(filtered))
    }
    return true
  } catch (error) {
    logger.error('storage.localStorage.delete_failed', { error, matchId })
    return false
  }
}

const loadMatchFromLocalStorage = (matchId) => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    if (savedMatches) {
      const matches = JSON.parse(savedMatches)
      if (!Array.isArray(matches)) return null
      return matches.find(m => m?.id === matchId) || null
    }
    return null
  } catch (error) {
    logger.error('storage.localStorage.load_match_failed', { error, matchId })
    return null
  }
}

