import { logger } from '../lib/logger'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Map Supabase snake_case columns → app camelCase shape
const mapRow = (row) => ({
  id: row.id,
  matchData: row.match_data,
  battingStats: row.batting_stats || [],
  bowlingStats: row.bowling_stats || [],
  deliveries: row.deliveries || [],
  scorecardState: row.scorecard_state || {},
  lastUpdated: row.updated_at || row.created_at,
})

// ─── Supabase CRUD ───────────────────────────────────────────────────────────

async function supabaseLoadMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []).map(mapRow)
}

async function supabaseSaveMatch(match) {
  const payload = {
    match_data: match.matchData,
    batting_stats: match.battingStats || [],
    bowling_stats: match.bowlingStats || [],
    deliveries: match.deliveries || [],
    scorecard_state: match.scorecardState || {},
  }

  // Update if valid UUID, otherwise insert
  if (match.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id)) {
    const { data, error } = await supabase
      .from('matches')
      .update(payload)
      .eq('id', match.id)
      .select()
      .single()
    if (error) throw error
    return data.id
  }

  const userId = await getUserId()
  const { data, error } = await supabase
    .from('matches')
    .insert({ ...payload, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data.id
}

async function supabaseDeleteMatch(matchId) {
  const { error } = await supabase.from('matches').delete().eq('id', matchId)
  if (error) throw error
  return true
}

async function supabaseLoadMatchById(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  if (error) throw error
  return mapRow(data)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const loadMatches = async () => {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseLoadMatches()
    } catch (error) {
      logger.error('storage.supabase.load_matches_failed', { error })
      return loadMatchesFromLocalStorage()
    }
  }
  return loadMatchesFromLocalStorage()
}

export const saveMatch = async (match) => {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseSaveMatch(match)
    } catch (error) {
      logger.error('storage.supabase.save_match_failed', { error, matchId: match?.id })
      return saveMatchToLocalStorage(match)
    }
  }
  return saveMatchToLocalStorage(match)
}

export const deleteMatch = async (matchId) => {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseDeleteMatch(matchId)
    } catch (error) {
      logger.error('storage.supabase.delete_match_failed', { error, matchId })
      return deleteMatchFromLocalStorage(matchId)
    }
  }
  return deleteMatchFromLocalStorage(matchId)
}

export const loadMatchById = async (matchId) => {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseLoadMatchById(matchId)
    } catch (error) {
      logger.error('storage.supabase.load_match_failed', { error, matchId })
      return loadMatchFromLocalStorage(matchId)
    }
  }
  return loadMatchFromLocalStorage(matchId)
}

// ─── localStorage fallback ────────────────────────────────────────────────────

const loadMatchesFromLocalStorage = () => {
  try {
    const saved = localStorage.getItem('cricket-matches')
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logger.error('storage.localStorage.load_failed', { error })
    return []
  }
}

const saveMatchToLocalStorage = (match) => {
  try {
    const saved = localStorage.getItem('cricket-matches')
    let matches = saved ? JSON.parse(saved) : []
    if (!Array.isArray(matches)) matches = []
    const id = match.id || `match-${Date.now()}`
    const existing = matches.findIndex(m => m.id === match.id)
    if (existing >= 0) matches[existing] = { ...match, id }
    else matches.push({ ...match, id })
    localStorage.setItem('cricket-matches', JSON.stringify(matches))
    return id
  } catch (error) {
    logger.error('storage.localStorage.save_failed', { error })
    return null
  }
}

const deleteMatchFromLocalStorage = (matchId) => {
  try {
    const saved = localStorage.getItem('cricket-matches')
    if (saved) {
      const matches = JSON.parse(saved)
      localStorage.setItem(
        'cricket-matches',
        JSON.stringify((Array.isArray(matches) ? matches : []).filter(m => m?.id !== matchId))
      )
    }
    return true
  } catch (error) {
    logger.error('storage.localStorage.delete_failed', { error, matchId })
    return false
  }
}

const loadMatchFromLocalStorage = (matchId) => {
  try {
    const saved = localStorage.getItem('cricket-matches')
    if (!saved) return null
    const matches = JSON.parse(saved)
    return Array.isArray(matches) ? (matches.find(m => m?.id === matchId) || null) : null
  } catch (error) {
    logger.error('storage.localStorage.load_match_failed', { error, matchId })
    return null
  }
}
