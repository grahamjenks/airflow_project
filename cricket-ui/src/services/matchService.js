import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Match Service - Handles all match data operations
 * Falls back to localStorage if Supabase is not configured
 */

// Load all matches
export const loadMatches = async () => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading matches from Supabase:', error)
        // Fallback to localStorage
        return loadMatchesFromLocalStorage()
      }

      // Transform data from Supabase format to app format
      return data.map(match => ({
        id: match.id,
        matchData: match.match_data,
        battingStats: match.batting_stats || [],
        bowlingStats: match.bowling_stats || [],
        lastUpdated: match.updated_at || match.created_at
      }))
    } catch (error) {
      console.error('Error loading matches:', error)
      return loadMatchesFromLocalStorage()
    }
  }

  return loadMatchesFromLocalStorage()
}

// Save a match (create or update)
export const saveMatch = async (match) => {
  if (isSupabaseConfigured()) {
    try {
      const matchData = {
        match_data: match.matchData,
        batting_stats: match.battingStats || [],
        bowling_stats: match.bowlingStats || [],
        updated_at: new Date().toISOString()
      }

      // Check if this is a new match (localStorage ID format) or existing UUID
      if (!match.id || match.id.startsWith('match-') || !match.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // This is a new match, create it (Supabase will generate UUID)
        const { data, error } = await supabase
          .from('matches')
          .insert([matchData])
          .select()
          .single()

        if (error) {
          console.error('Error saving match to Supabase:', error)
          return saveMatchToLocalStorage(match)
        }

        return data.id
      } else {
        // Update existing match (valid UUID)
        const { error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', match.id)

        if (error) {
          console.error('Error updating match in Supabase:', error)
          return saveMatchToLocalStorage(match)
        }

        return match.id
      }
    } catch (error) {
      console.error('Error saving match:', error)
      return saveMatchToLocalStorage(match)
    }
  }

  return saveMatchToLocalStorage(match)
}

// Delete a match
export const deleteMatch = async (matchId) => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)

      if (error) {
        console.error('Error deleting match from Supabase:', error)
        return deleteMatchFromLocalStorage(matchId)
      }

      return true
    } catch (error) {
      console.error('Error deleting match:', error)
      return deleteMatchFromLocalStorage(matchId)
    }
  }

  return deleteMatchFromLocalStorage(matchId)
}

// Load a single match by ID
export const loadMatchById = async (matchId) => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (error) {
        console.error('Error loading match from Supabase:', error)
        return loadMatchFromLocalStorage(matchId)
      }

      return {
        id: data.id,
        matchData: data.match_data,
        battingStats: data.batting_stats || [],
        bowlingStats: data.bowling_stats || [],
        lastUpdated: data.updated_at || data.created_at
      }
    } catch (error) {
      console.error('Error loading match:', error)
      return loadMatchFromLocalStorage(matchId)
    }
  }

  return loadMatchFromLocalStorage(matchId)
}

// ==================== localStorage Fallback Functions ====================

const loadMatchesFromLocalStorage = () => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    return savedMatches ? JSON.parse(savedMatches) : []
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return []
  }
}

const saveMatchToLocalStorage = (match) => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    let matches = savedMatches ? JSON.parse(savedMatches) : []

    if (match.id && !match.id.startsWith('match-')) {
      // Update existing match
      matches = matches.map(m => m.id === match.id ? match : m)
    } else {
      // Add new match
      const newMatch = {
        ...match,
        id: match.id || `match-${Date.now()}`
      }
      matches.push(newMatch)
    }

    localStorage.setItem('cricket-matches', JSON.stringify(matches))
    return match.id || `match-${Date.now()}`
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    return null
  }
}

const deleteMatchFromLocalStorage = (matchId) => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    if (savedMatches) {
      const matches = JSON.parse(savedMatches)
      const filtered = matches.filter(m => m.id !== matchId)
      localStorage.setItem('cricket-matches', JSON.stringify(filtered))
    }
    return true
  } catch (error) {
    console.error('Error deleting from localStorage:', error)
    return false
  }
}

const loadMatchFromLocalStorage = (matchId) => {
  try {
    const savedMatches = localStorage.getItem('cricket-matches')
    if (savedMatches) {
      const matches = JSON.parse(savedMatches)
      return matches.find(m => m.id === matchId) || null
    }
    return null
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return null
  }
}

