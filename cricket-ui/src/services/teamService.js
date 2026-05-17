import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export const loadTeams = async () => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  } catch (err) {
    logger.error('teams.load_failed', { error: err })
    return []
  }
}

export const saveTeam = async (team) => {
  try {
    if (team.id) {
      const { data, error } = await supabase
        .from('teams')
        .update({ name: team.name, short_name: team.shortName, home_ground: team.homeGround })
        .eq('id', team.id)
        .select()
        .single()
      if (error) throw error
      return mapTeam(data)
    }
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('teams')
      .insert({ user_id: userId, name: team.name, short_name: team.shortName, home_ground: team.homeGround })
      .select()
      .single()
    if (error) throw error
    return mapTeam(data)
  } catch (err) {
    logger.error('teams.save_failed', { error: err })
    throw err
  }
}

export const deleteTeam = async (teamId) => {
  try {
    const { error } = await supabase.from('teams').delete().eq('id', teamId)
    if (error) throw error
    return true
  } catch (err) {
    logger.error('teams.delete_failed', { error: err, teamId })
    throw err
  }
}

const mapTeam = (row) => ({
  id: row.id,
  name: row.name,
  shortName: row.short_name || '',
  homeGround: row.home_ground || '',
  createdAt: row.created_at,
})

// ─── Players ──────────────────────────────────────────────────────────────────

export const loadPlayers = async (teamId) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('name')
    if (error) throw error
    return (data || []).map(mapPlayer)
  } catch (err) {
    logger.error('players.load_failed', { error: err, teamId })
    return []
  }
}

export const savePlayer = async (player) => {
  try {
    const payload = {
      team_id: player.teamId,
      name: player.name,
      role: player.role,
      batting_style: player.battingStyle || null,
      bowling_style: player.bowlingStyle || null,
      jersey_number: player.jerseyNumber ? parseInt(player.jerseyNumber) : null,
    }
    if (player.id) {
      const { data, error } = await supabase
        .from('players')
        .update(payload)
        .eq('id', player.id)
        .select()
        .single()
      if (error) throw error
      return mapPlayer(data)
    }
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('players')
      .insert({ ...payload, user_id: userId })
      .select()
      .single()
    if (error) throw error
    return mapPlayer(data)
  } catch (err) {
    logger.error('players.save_failed', { error: err })
    throw err
  }
}

export const deletePlayer = async (playerId) => {
  try {
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    if (error) throw error
    return true
  } catch (err) {
    logger.error('players.delete_failed', { error: err, playerId })
    throw err
  }
}

const mapPlayer = (row) => ({
  id: row.id,
  teamId: row.team_id,
  name: row.name,
  role: row.role || '',
  battingStyle: row.batting_style || '',
  bowlingStyle: row.bowling_style || '',
  jerseyNumber: row.jersey_number || '',
})
