import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

vi.mock('../services/matchService', () => ({
  loadMatches: vi.fn(),
  deleteMatch: vi.fn().mockResolvedValue(true),
  saveMatch: vi.fn(),
  loadMatchById: vi.fn(),
}))

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import SearchMatches from './SearchMatches'
import { loadMatches } from '../services/matchService'

const SAMPLE_MATCHES = [
  {
    id: 'match-1',
    matchData: { team1: 'India', team2: 'Australia', venue: 'MCG', matchType: 'T20', date: '2026-01-10' },
    battingStats: [{ playerName: 'Sachin', runs: 100 }],
    bowlingStats: [],
    deliveries: [],
  },
  {
    id: 'match-2',
    matchData: { team1: 'England', team2: 'NZ', venue: 'Lords', matchType: 'ODI', date: '2026-01-15' },
    battingStats: [],
    bowlingStats: [{ playerName: 'Anderson', wickets: 3 }],
    deliveries: [],
  },
]

beforeEach(() => {
  loadMatches.mockResolvedValue([])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('SearchMatches rendering', () => {
  it('renders the search matches container', () => {
    const { container } = render(<SearchMatches />)
    expect(container.querySelector('.search-matches')).toBeInTheDocument()
  })

  it('shows loading state on initial render', () => {
    render(<SearchMatches />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders search input after loading when matches exist', async () => {
    loadMatches.mockResolvedValue(SAMPLE_MATCHES)
    render(<SearchMatches />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    expect(screen.getByPlaceholderText(/search by team/i)).toBeInTheDocument()
  })

  it('shows empty state when no matches found', async () => {
    loadMatches.mockResolvedValue([])
    render(<SearchMatches />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
    expect(screen.getByText(/no saved matches/i)).toBeInTheDocument()
  })

  it('renders match cards when matches are returned', async () => {
    loadMatches.mockResolvedValue(SAMPLE_MATCHES)
    render(<SearchMatches />)
    await waitFor(() => expect(screen.getByText('India vs Australia')).toBeInTheDocument())
    expect(screen.getByText('England vs NZ')).toBeInTheDocument()
  })
})

// ── Search filtering ──────────────────────────────────────────────────────────

describe('SearchMatches search filtering', () => {
  it('filters matches by team name', async () => {
    const user = userEvent.setup()
    loadMatches.mockResolvedValue(SAMPLE_MATCHES)
    render(<SearchMatches />)
    await waitFor(() => expect(screen.getByText('India vs Australia')).toBeInTheDocument())
    const searchInput = screen.getByPlaceholderText(/search by team/i)
    await user.type(searchInput, 'India')
    expect(screen.getByText('India vs Australia')).toBeInTheDocument()
    expect(screen.queryByText('England vs NZ')).not.toBeInTheDocument()
  })

  it('filters by player name in batting stats', async () => {
    const user = userEvent.setup()
    loadMatches.mockResolvedValue(SAMPLE_MATCHES)
    render(<SearchMatches />)
    await waitFor(() => expect(screen.getByText('India vs Australia')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/search by team/i), 'Sachin')
    expect(screen.getByText('India vs Australia')).toBeInTheDocument()
    expect(screen.queryByText('England vs NZ')).not.toBeInTheDocument()
  })

  it('restores all matches when search is cleared', async () => {
    const user = userEvent.setup()
    loadMatches.mockResolvedValue(SAMPLE_MATCHES)
    render(<SearchMatches />)
    await waitFor(() => expect(screen.getByText('India vs Australia')).toBeInTheDocument())
    const input = screen.getByPlaceholderText(/search by team/i)
    await user.type(input, 'India')
    await user.clear(input)
    await waitFor(() => expect(screen.getByText('England vs NZ')).toBeInTheDocument())
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('SearchMatches error state', () => {
  it('shows error message when loadMatches rejects', async () => {
    loadMatches.mockRejectedValue(new Error('Network error'))
    render(<SearchMatches />)
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument())
  })
})
