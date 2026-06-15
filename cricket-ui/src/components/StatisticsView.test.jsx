import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock recharts — ResponsiveContainer requires ResizeObserver which isn't in
// jsdom, and we're testing component logic rather than chart rendering.
vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}))

import StatisticsView from './StatisticsView'

const MATCH_DATA = { team1: 'India', team2: 'Australia', venue: 'MCG', matchType: 'T20', overs: 20, date: '2026-01-10' }

const BATTING_STATS = [
  { playerName: 'Sachin', team: 'India', innings: 1, runs: 100, balls: 70, fours: 8, sixes: 3, strikeRate: '142.86', dismissalType: 'Caught' },
  { playerName: 'Kohli', team: 'India', innings: 1, runs: 50, balls: 35, fours: 4, sixes: 1, strikeRate: '142.86', dismissalType: 'Not Out' },
]

const BOWLING_STATS = [
  { playerName: 'Cummins', team: 'Australia', innings: 1, overs: '4', maidens: 0, runs: 28, wickets: 2, economy: '7.00', average: '14.00', strikeRate: '12.00', wides: 1, noBalls: 0 },
]

const DELIVERIES = [
  { striker: 'Sachin', bowler: 'Cummins', battingTeam: 'India', bowlingTeam: 'Australia', innings: 1, overNum: 0, batRuns: 4, extraRuns: 0, extraType: null, isLegalDelivery: true, isRetirement: false, wicket: null },
]

function renderView(props = {}) {
  const onReset = vi.fn()
  const onSave = vi.fn()
  const onViewScorecard = vi.fn()
  const result = render(
    <StatisticsView
      matchData={MATCH_DATA}
      battingStats={BATTING_STATS}
      bowlingStats={BOWLING_STATS}
      deliveries={DELIVERIES}
      onReset={onReset}
      onSave={onSave}
      onViewScorecard={onViewScorecard}
      {...props}
    />
  )
  return { ...result, onReset, onSave, onViewScorecard }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('StatisticsView rendering', () => {
  it('renders the statistics view container', () => {
    const { container } = renderView()
    expect(container.querySelector('.statistics-view')).toBeInTheDocument()
  })

  it('renders the header', () => {
    const { container } = renderView()
    expect(container.querySelector('.view-header')).toBeInTheDocument()
  })

  it('renders a reset / new match button', () => {
    renderView()
    expect(screen.getByText(/new match|reset/i)).toBeInTheDocument()
  })

  it('renders an export button', () => {
    renderView()
    // There may be an "Export Data" heading and an "Export as JSON" button
    expect(screen.getAllByText(/export/i).length).toBeGreaterThan(0)
  })

  it('shows match venue when matchData is provided', () => {
    renderView()
    expect(screen.getByText('MCG')).toBeInTheDocument()
  })

  it('shows both team names somewhere in the view', () => {
    renderView()
    expect(screen.getAllByText(/india/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/australia/i).length).toBeGreaterThan(0)
  })
})

// ── Batting stats table ───────────────────────────────────────────────────────

describe('StatisticsView batting stats', () => {
  it('shows all batter names', () => {
    renderView()
    expect(screen.getAllByText('Sachin').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Kohli').length).toBeGreaterThan(0)
  })

  it('shows batter runs', () => {
    renderView()
    expect(screen.getAllByText('100').length).toBeGreaterThan(0)
    expect(screen.getAllByText('50').length).toBeGreaterThan(0)
  })
})

// ── Bowling stats table ───────────────────────────────────────────────────────

describe('StatisticsView bowling stats', () => {
  it('shows bowler names', () => {
    renderView()
    expect(screen.getAllByText('Cummins').length).toBeGreaterThan(0)
  })
})

// ── Empty / null state ────────────────────────────────────────────────────────

describe('StatisticsView empty state', () => {
  it('renders without matchData', () => {
    const { container } = render(
      <StatisticsView battingStats={[]} bowlingStats={[]} deliveries={[]} />
    )
    expect(container.querySelector('.statistics-view')).toBeInTheDocument()
  })

  it('does not show batter names when stats are empty', () => {
    renderView({ battingStats: [], bowlingStats: [], deliveries: [] })
    expect(screen.queryByText('Sachin')).not.toBeInTheDocument()
  })
})

// ── Callbacks ─────────────────────────────────────────────────────────────────

describe('StatisticsView callbacks', () => {
  it('calls onReset when the reset/new-match button is clicked', () => {
    const { onReset } = renderView()
    fireEvent.click(screen.getByText(/new match|reset/i))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
