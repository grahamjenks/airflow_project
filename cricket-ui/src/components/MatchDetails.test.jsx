import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock Supabase so isSupabaseConfigured() returns false → no blocking prompt
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn().mockResolvedValue(null),
}))

// Mock teamService so loadPlayers resolves immediately with no players
vi.mock('../services/teamService', () => ({
  loadPlayers: vi.fn().mockResolvedValue([]),
  loadTeams: vi.fn().mockResolvedValue([]),
  saveTeam: vi.fn(),
  deleteTeam: vi.fn(),
  savePlayer: vi.fn(),
  deletePlayer: vi.fn(),
}))

import MatchDetails from './MatchDetails'

function renderMatchDetails(props = {}) {
  const onSubmit = vi.fn()
  const result = render(
    <MatchDetails onSubmit={onSubmit} matchData={null} teams={[]} session={null} {...props} />
  )
  return { ...result, onSubmit }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('MatchDetails rendering', () => {
  it('renders the match details container', () => {
    const { container } = renderMatchDetails()
    expect(container.querySelector('.match-details')).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    renderMatchDetails()
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('renders the match form', () => {
    const { container } = renderMatchDetails()
    expect(container.querySelector('.match-form')).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderMatchDetails()
    expect(screen.getByRole('button', { name: /start match|save|submit/i })).toBeInTheDocument()
  })

  it('renders venue input field', () => {
    renderMatchDetails()
    expect(screen.getByLabelText(/venue/i)).toBeInTheDocument()
  })

  it('renders match type selector', () => {
    renderMatchDetails()
    expect(screen.getByLabelText(/match type/i)).toBeInTheDocument()
  })
})

// ── Pre-population ────────────────────────────────────────────────────────────

describe('MatchDetails with existing matchData', () => {
  const existingData = {
    matchType: 'T20',
    team1: 'India',
    team1Id: '',
    team2: 'Australia',
    team2Id: '',
    venue: 'MCG',
    date: '2026-01-15',
    format: 'T20',
    overs: 20,
    tossWinner: '',
    tossDecision: '',
    team1XI: [],
    team2XI: [],
    noBallPenalty: 1,
  }

  it('pre-fills venue from matchData', () => {
    renderMatchDetails({ matchData: existingData })
    expect(screen.getByLabelText(/venue/i)).toHaveValue('MCG')
  })
})

// ── Input handling ────────────────────────────────────────────────────────────

describe('MatchDetails input handling', () => {
  it('allows typing in the venue field', async () => {
    const user = userEvent.setup()
    renderMatchDetails()
    const venueInput = screen.getByLabelText(/venue/i)
    await user.clear(venueInput)
    await user.type(venueInput, 'Lords')
    expect(venueInput).toHaveValue('Lords')
  })

  it('allows changing match type', async () => {
    const user = userEvent.setup()
    renderMatchDetails()
    const select = screen.getByLabelText(/match type/i)
    await user.selectOptions(select, 'ODI')
    expect(select).toHaveValue('ODI')
  })
})

// ── Form submission ───────────────────────────────────────────────────────────

describe('MatchDetails form submission', () => {
  it('calls onSubmit when form is submitted', () => {
    const { onSubmit, container } = renderMatchDetails()
    fireEvent.submit(container.querySelector('.match-form'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('passes an object to onSubmit', () => {
    const { onSubmit, container } = renderMatchDetails()
    fireEvent.submit(container.querySelector('.match-form'))
    expect(onSubmit.mock.calls[0][0]).toBeInstanceOf(Object)
  })
})

// ── Validation ────────────────────────────────────────────────────────────────

describe('MatchDetails validation', () => {
  const sameTeamData = {
    matchType: 'T20', team1: 'India', team1Id: '', team2: 'India', team2Id: '',
    venue: 'MCG', date: '2026-01-15', format: 'T20', overs: 20,
    tossWinner: '', tossDecision: '', team1XI: [], team2XI: [], noBallPenalty: 1,
  }

  it('blocks submission when both teams are the same', () => {
    const { onSubmit, container } = renderMatchDetails({ matchData: sameTeamData })
    fireEvent.submit(container.querySelector('.match-form'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows an error message when both teams are the same', () => {
    const { container } = renderMatchDetails({ matchData: sameTeamData })
    fireEvent.submit(container.querySelector('.match-form'))
    expect(screen.getByRole('alert')).toHaveTextContent(/must be different/i)
  })

  it('treats same team names case-insensitively', () => {
    const { onSubmit, container } = renderMatchDetails({
      matchData: { ...sameTeamData, team1: 'India', team2: 'india' },
    })
    fireEvent.submit(container.querySelector('.match-form'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('allows submission when teams are different', () => {
    const { onSubmit, container } = renderMatchDetails({
      matchData: { ...sameTeamData, team2: 'Australia' },
    })
    fireEvent.submit(container.querySelector('.match-form'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('clears the error once teams are made different and resubmitted', async () => {
    const user = userEvent.setup()
    const { onSubmit, container } = renderMatchDetails({ matchData: sameTeamData })
    fireEvent.submit(container.querySelector('.match-form'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // With no teams prop, team inputs are free-text — change Team 2 to differ
    const team2 = screen.getByLabelText(/team 2/i)
    await user.clear(team2)
    await user.type(team2, 'Australia')

    // Error should clear live, before any resubmit
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.submit(container.querySelector('.match-form'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
