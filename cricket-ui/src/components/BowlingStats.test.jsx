import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import BowlingStats from './BowlingStats'

function renderWithStats(existingStats = []) {
  const onSubmit = vi.fn()
  const result = render(<BowlingStats onSubmit={onSubmit} existingStats={existingStats} />)
  return { ...result, onSubmit }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('BowlingStats rendering', () => {
  it('renders the bowling stats container', () => {
    const { container } = renderWithStats()
    expect(container.querySelector('.bowling-stats')).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    renderWithStats()
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('renders the bowling form', () => {
    const { container } = renderWithStats()
    expect(container.querySelector('.bowling-form')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    renderWithStats()
    expect(screen.getByRole('button', { name: /add bowling stats/i })).toBeInTheDocument()
  })

  it('does not show stats grid when existingStats is empty', () => {
    const { container } = renderWithStats([])
    expect(container.querySelector('.stats-grid')).not.toBeInTheDocument()
  })

  it('shows stats grid when existingStats are provided', () => {
    const stats = [{ playerName: 'Warne', team: 'Australia', overs: '10', maidens: 1, runs: 36, wickets: 3, economy: '3.60', average: '12.00', strikeRate: '20.00' }]
    const { container } = renderWithStats(stats)
    expect(container.querySelector('.stats-grid')).toBeInTheDocument()
    expect(screen.getByText('Warne')).toBeInTheDocument()
  })
})

// ── Input handling ────────────────────────────────────────────────────────────

describe('BowlingStats input handling', () => {
  it('updates bowler name input', async () => {
    const user = userEvent.setup()
    renderWithStats()
    const input = screen.getByLabelText(/bowler name/i)
    await user.type(input, 'Warne')
    expect(input).toHaveValue('Warne')
  })

  it('updates overs input', async () => {
    const user = userEvent.setup()
    renderWithStats()
    const input = screen.getByLabelText(/^overs$/i)
    await user.clear(input)
    await user.type(input, '10')
    expect(input).toHaveValue(10)
  })

  it('updates wickets input', async () => {
    const user = userEvent.setup()
    renderWithStats()
    const input = screen.getByLabelText(/wickets/i)
    await user.clear(input)
    await user.type(input, '3')
    expect(input).toHaveValue(3)
  })
})

// ── Calculations ──────────────────────────────────────────────────────────────

describe('BowlingStats calculations', () => {
  it('shows economy rate when overs are entered', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.clear(screen.getByLabelText(/^overs$/i))
    await user.type(screen.getByLabelText(/^overs$/i), '10')
    await user.clear(screen.getByLabelText(/runs conceded/i))
    await user.type(screen.getByLabelText(/runs conceded/i), '40')
    expect(await screen.findByText(/economy rate/i)).toBeInTheDocument()
    expect(screen.getByText(/4\.00/)).toBeInTheDocument()
  })

  it('shows bowling average when wickets > 0', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.clear(screen.getByLabelText(/^overs$/i))
    await user.type(screen.getByLabelText(/^overs$/i), '5')
    await user.clear(screen.getByLabelText(/runs conceded/i))
    await user.type(screen.getByLabelText(/runs conceded/i), '20')
    await user.clear(screen.getByLabelText(/wickets/i))
    await user.type(screen.getByLabelText(/wickets/i), '4')
    // average = 20/4 = 5.00; SR = 30/4 = 7.50 — distinct values
    expect(await screen.findByText(/bowling average/i)).toBeInTheDocument()
    expect(screen.getByText(/5\.00/)).toBeInTheDocument()
  })

  it('does not show average section when wickets is 0', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.clear(screen.getByLabelText(/^overs$/i))
    await user.type(screen.getByLabelText(/^overs$/i), '5')
    await user.clear(screen.getByLabelText(/runs conceded/i))
    await user.type(screen.getByLabelText(/runs conceded/i), '30')
    expect(screen.queryByText(/bowling average/i)).not.toBeInTheDocument()
  })
})

// ── Form submission ───────────────────────────────────────────────────────────

describe('BowlingStats form submission', () => {
  it('calls onSubmit with calculated stats', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderWithStats()
    await user.type(screen.getByLabelText(/bowler name/i), 'Warne')
    await user.type(screen.getByLabelText(/team/i), 'Australia')
    await user.clear(screen.getByLabelText(/^overs$/i))
    await user.type(screen.getByLabelText(/^overs$/i), '10')
    await user.clear(screen.getByLabelText(/runs conceded/i))
    await user.type(screen.getByLabelText(/runs conceded/i), '40')
    await user.clear(screen.getByLabelText(/wickets/i))
    await user.type(screen.getByLabelText(/wickets/i), '2')
    fireEvent.submit(screen.getByRole('button', { name: /add bowling stats/i }).closest('form'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const arg = onSubmit.mock.calls[0][0]
    expect(arg.playerName).toBe('Warne')
    expect(arg.economy).toBeDefined()
    expect(arg.average).toBeDefined()
    expect(arg.strikeRate).toBeDefined()
    expect(arg.timestamp).toBeDefined()
  })

  it('resets form after submission', async () => {
    const user = userEvent.setup()
    renderWithStats()
    await user.type(screen.getByLabelText(/bowler name/i), 'Warne')
    fireEvent.submit(screen.getByRole('button', { name: /add bowling stats/i }).closest('form'))
    expect(screen.getByLabelText(/bowler name/i)).toHaveValue('')
  })
})
