import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import BattingStats from './BattingStats'

function renderWithStats(existingStats = []) {
  const onSubmit = vi.fn()
  const result = render(<BattingStats onSubmit={onSubmit} existingStats={existingStats} />)
  return { ...result, onSubmit }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('BattingStats rendering', () => {
  it('renders the batting stats container', () => {
    const { container } = renderWithStats()
    expect(container.querySelector('.batting-stats')).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    renderWithStats()
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('renders the batting form', () => {
    const { container } = renderWithStats()
    expect(container.querySelector('.batting-form')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    renderWithStats()
    expect(screen.getByRole('button', { name: /add batting stats/i })).toBeInTheDocument()
  })

  it('does not show stats grid when existingStats is empty', () => {
    const { container } = renderWithStats([])
    expect(container.querySelector('.stats-grid')).not.toBeInTheDocument()
  })

  it('shows stats grid when existingStats is non-empty', () => {
    const stats = [{ playerName: 'Sachin', runs: 100, balls: 50, strikeRate: '200.00', team: 'India', fours: 8, sixes: 5, dismissalType: 'Not Out' }]
    const { container } = renderWithStats(stats)
    expect(container.querySelector('.stats-grid')).toBeInTheDocument()
    expect(screen.getByText('Sachin')).toBeInTheDocument()
  })

  it('hides bowler/fielder fields by default (Not Out)', () => {
    renderWithStats()
    expect(screen.queryByLabelText(/bowler/i)).not.toBeInTheDocument()
  })
})

// ── Input handling ────────────────────────────────────────────────────────────

describe('BattingStats input handling', () => {
  it('updates player name input', async () => {
    const user = userEvent.setup()
    renderWithStats()
    const input = screen.getByLabelText(/player name/i)
    await user.type(input, 'Sachin')
    expect(input).toHaveValue('Sachin')
  })

  it('updates runs input', async () => {
    const user = userEvent.setup()
    renderWithStats()
    const input = screen.getByLabelText(/^runs$/i)
    await user.clear(input)
    await user.type(input, '75')
    expect(input).toHaveValue(75)
  })

  it('shows bowler field when dismissal type is Bowled', async () => {
    const user = userEvent.setup()
    renderWithStats()
    const select = screen.getByLabelText(/dismissal type/i)
    await user.selectOptions(select, 'Bowled')
    expect(screen.getByLabelText(/bowler/i)).toBeInTheDocument()
  })

  it('shows fielder field when dismissal type is Caught', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.selectOptions(screen.getByLabelText(/dismissal type/i), 'Caught')
    expect(screen.getByLabelText(/fielder/i)).toBeInTheDocument()
  })

  it('does not show fielder field for LBW', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.selectOptions(screen.getByLabelText(/dismissal type/i), 'LBW')
    expect(screen.queryByLabelText(/fielder/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/bowler/i)).toBeInTheDocument()
  })

  it('hides bowler field for Retired Hurt', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.selectOptions(screen.getByLabelText(/dismissal type/i), 'Retired Hurt')
    expect(screen.queryByLabelText(/bowler/i)).not.toBeInTheDocument()
  })
})

// ── Calculations ──────────────────────────────────────────────────────────────

describe('BattingStats calculations', () => {
  it('shows strike rate when runs and balls are entered', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.clear(screen.getByLabelText(/^runs$/i))
    await user.type(screen.getByLabelText(/^runs$/i), '50')
    await user.clear(screen.getByLabelText(/balls faced/i))
    await user.type(screen.getByLabelText(/balls faced/i), '25')
    expect(await screen.findByText(/strike rate/i)).toBeInTheDocument()
    expect(screen.getByText(/200\.00/)).toBeInTheDocument()
  })

  it('shows overall average when existingStats are present', async () => {
    const user = userEvent.setup()
    const existing = [{ runs: 50, balls: 30, dismissalType: 'Bowled', playerName: 'X', team: 'A', strikeRate: '166.67', fours: 2, sixes: 1 }]
    renderWithStats(existing)
    await user.clear(screen.getByLabelText(/^runs$/i))
    await user.type(screen.getByLabelText(/^runs$/i), '30')
    await user.clear(screen.getByLabelText(/balls faced/i))
    await user.type(screen.getByLabelText(/balls faced/i), '20')
    expect(await screen.findByText(/overall average/i)).toBeInTheDocument()
  })
})

// ── Form submission ───────────────────────────────────────────────────────────

describe('BattingStats form submission', () => {
  it('calls onSubmit with form data on submit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderWithStats()
    await user.type(screen.getByLabelText(/player name/i), 'Sachin')
    await user.type(screen.getByLabelText(/team/i), 'India')
    fireEvent.submit(screen.getByRole('button', { name: /add batting stats/i }).closest('form'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const arg = onSubmit.mock.calls[0][0]
    expect(arg.playerName).toBe('Sachin')
    expect(arg.team).toBe('India')
    expect(arg.strikeRate).toBeDefined()
    expect(arg.timestamp).toBeDefined()
  })

  it('resets form to defaults after submission', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.type(screen.getByLabelText(/player name/i), 'Sachin')
    fireEvent.submit(screen.getByRole('button', { name: /add batting stats/i }).closest('form'))
    expect(screen.getByLabelText(/player name/i)).toHaveValue('')
  })
})
