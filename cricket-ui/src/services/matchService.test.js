/**
 * Tests for the localStorage fallback path of matchService.
 *
 * Supabase env vars are not set in tests, so isSupabaseConfigured() returns
 * false and all functions fall through to the localStorage implementation.
 */

import { beforeEach, describe, it, expect } from 'vitest'
import { loadMatches, saveMatch, deleteMatch, loadMatchById } from './matchService'

const MATCH_A = {
  id: 'match-aaa',
  matchData: { team1: 'India', team2: 'Australia' },
  battingStats: [],
  bowlingStats: [],
  deliveries: [],
  scorecardState: {},
}

const MATCH_B = {
  id: 'match-bbb',
  matchData: { team1: 'England', team2: 'NZ' },
  battingStats: [],
  bowlingStats: [],
  deliveries: [],
  scorecardState: {},
}

beforeEach(() => {
  localStorage.clear()
})

// ── loadMatches ───────────────────────────────────────────────────────────────

describe('loadMatches', () => {
  it('returns empty array when localStorage is empty', async () => {
    const result = await loadMatches()
    expect(result).toEqual([])
  })

  it('returns all stored matches', async () => {
    await saveMatch(MATCH_A)
    await saveMatch(MATCH_B)
    const result = await loadMatches()
    expect(result).toHaveLength(2)
  })

  it('returns empty array when localStorage value is not valid JSON', async () => {
    localStorage.setItem('cricket-matches', 'not-json')
    const result = await loadMatches()
    expect(result).toEqual([])
  })

  it('returns empty array when stored value is not an array', async () => {
    localStorage.setItem('cricket-matches', '{"not": "array"}')
    const result = await loadMatches()
    expect(result).toEqual([])
  })
})

// ── saveMatch ─────────────────────────────────────────────────────────────────

describe('saveMatch', () => {
  it('returns the match id after saving', async () => {
    const id = await saveMatch(MATCH_A)
    expect(id).toBe('match-aaa')
  })

  it('persists match so it can be loaded', async () => {
    await saveMatch(MATCH_A)
    const matches = await loadMatches()
    expect(matches).toHaveLength(1)
    expect(matches[0].id).toBe('match-aaa')
    expect(matches[0].matchData.team1).toBe('India')
  })

  it('updates existing match instead of duplicating', async () => {
    await saveMatch(MATCH_A)
    await saveMatch({ ...MATCH_A, matchData: { team1: 'Pakistan', team2: 'SL' } })
    const matches = await loadMatches()
    expect(matches).toHaveLength(1)
    expect(matches[0].matchData.team1).toBe('Pakistan')
  })

  it('assigns a generated id when none provided', async () => {
    const { id: _omitted, ...matchWithoutId } = MATCH_A
    const returnedId = await saveMatch(matchWithoutId)
    expect(returnedId).toBeTruthy()
    const matches = await loadMatches()
    expect(matches[0].id).toBe(returnedId)
  })

  it('handles multiple saves correctly', async () => {
    await saveMatch(MATCH_A)
    await saveMatch(MATCH_B)
    const matches = await loadMatches()
    expect(matches).toHaveLength(2)
  })
})

// ── deleteMatch ───────────────────────────────────────────────────────────────

describe('deleteMatch', () => {
  it('removes the match from storage', async () => {
    await saveMatch(MATCH_A)
    await saveMatch(MATCH_B)
    await deleteMatch('match-aaa')
    const matches = await loadMatches()
    expect(matches).toHaveLength(1)
    expect(matches[0].id).toBe('match-bbb')
  })

  it('returns true on success', async () => {
    await saveMatch(MATCH_A)
    const result = await deleteMatch('match-aaa')
    expect(result).toBe(true)
  })

  it('is idempotent for a nonexistent id', async () => {
    await saveMatch(MATCH_A)
    await deleteMatch('nonexistent-id')
    const matches = await loadMatches()
    expect(matches).toHaveLength(1)
  })
})

// ── loadMatchById ─────────────────────────────────────────────────────────────

describe('loadMatchById', () => {
  it('returns the specific match by id', async () => {
    await saveMatch(MATCH_A)
    await saveMatch(MATCH_B)
    const match = await loadMatchById('match-bbb')
    expect(match.matchData.team1).toBe('England')
  })

  it('returns null when id does not exist', async () => {
    await saveMatch(MATCH_A)
    const match = await loadMatchById('nonexistent')
    expect(match).toBeNull()
  })

  it('returns null when localStorage is empty', async () => {
    const match = await loadMatchById('anything')
    expect(match).toBeNull()
  })
})
