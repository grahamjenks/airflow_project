import { deriveBattingStats, deriveBowlingStats } from './App'

// ─── Shared delivery builders ─────────────────────────────────────────────────

function delivery(overrides = {}) {
  return {
    striker: 'Player A',
    bowler: 'Bowler X',
    battingTeam: 'India',
    bowlingTeam: 'Australia',
    innings: 1,
    overNum: 0,
    batRuns: 1,
    extraRuns: 0,
    extraType: null,
    isLegalDelivery: true,
    isRetirement: false,
    wicket: null,
    ...overrides,
  }
}

// ─── deriveBattingStats ───────────────────────────────────────────────────────

describe('deriveBattingStats', () => {
  it('returns empty array for no deliveries', () => {
    expect(deriveBattingStats([])).toEqual([])
  })

  it('accumulates runs for a single batter', () => {
    const deliveries = [
      delivery({ batRuns: 4 }),
      delivery({ batRuns: 2 }),
      delivery({ batRuns: 0 }),
    ]
    const [stat] = deriveBattingStats(deliveries)
    expect(stat.runs).toBe(6)
    expect(stat.balls).toBe(3)
  })

  it('counts fours correctly', () => {
    const deliveries = [delivery({ batRuns: 4 }), delivery({ batRuns: 4 }), delivery({ batRuns: 1 })]
    const [stat] = deriveBattingStats(deliveries)
    expect(stat.fours).toBe(2)
    expect(stat.sixes).toBe(0)
  })

  it('counts sixes correctly', () => {
    const deliveries = [delivery({ batRuns: 6 }), delivery({ batRuns: 1 })]
    const [stat] = deriveBattingStats(deliveries)
    expect(stat.sixes).toBe(1)
  })

  it('excludes wides from ball count', () => {
    const deliveries = [
      delivery({ batRuns: 0, extraType: 'wide', isLegalDelivery: false }),
      delivery({ batRuns: 1 }),
    ]
    const [stat] = deriveBattingStats(deliveries)
    expect(stat.balls).toBe(1)
  })

  it('excludes byes from batter runs', () => {
    const deliveries = [
      delivery({ batRuns: 0, extraRuns: 2, extraType: 'bye' }),
      delivery({ batRuns: 3 }),
    ]
    const [stat] = deriveBattingStats(deliveries)
    expect(stat.runs).toBe(3)
  })

  it('calculates strike rate correctly', () => {
    const deliveries = [
      delivery({ batRuns: 4 }),
      delivery({ batRuns: 0 }),
    ]
    const [stat] = deriveBattingStats(deliveries)
    // 4 runs off 2 balls = 200.00 SR
    expect(stat.strikeRate).toBe('200.00')
  })

  it('returns zero strike rate when no balls faced', () => {
    const deliveries = [delivery({ batRuns: 0, extraType: 'wide', isLegalDelivery: false })]
    const [stat] = deriveBattingStats(deliveries)
    expect(stat.strikeRate).toBe('0.00')
  })

  it('records dismissal type from wicket', () => {
    const deliveries = [
      delivery({ batRuns: 10 }),
      delivery({
        batRuns: 0,
        wicket: { type: 'Bowled', outBatsman: 'Player A', fielder: '' },
      }),
    ]
    const [stat] = deriveBattingStats(deliveries)
    expect(stat.dismissalType).toBe('Bowled')
  })

  it('defaults dismissal type to Not Out', () => {
    const [stat] = deriveBattingStats([delivery()])
    expect(stat.dismissalType).toBe('Not Out')
  })

  it('tracks two batters in same innings separately', () => {
    const deliveries = [
      delivery({ striker: 'Player A', batRuns: 10 }),
      delivery({ striker: 'Player B', batRuns: 5 }),
    ]
    const stats = deriveBattingStats(deliveries)
    expect(stats).toHaveLength(2)
    const a = stats.find(s => s.playerName === 'Player A')
    const b = stats.find(s => s.playerName === 'Player B')
    expect(a.runs).toBe(10)
    expect(b.runs).toBe(5)
  })

  it('skips retirement deliveries', () => {
    const deliveries = [
      delivery({ striker: 'Player A', batRuns: 5, isRetirement: true }),
    ]
    expect(deriveBattingStats(deliveries)).toEqual([])
  })

  it('keeps innings separate for same player', () => {
    const deliveries = [
      delivery({ striker: 'Player A', innings: 1, batRuns: 20 }),
      delivery({ striker: 'Player A', innings: 2, batRuns: 30 }),
    ]
    const stats = deriveBattingStats(deliveries)
    expect(stats).toHaveLength(2)
    expect(stats.find(s => s.innings === 1).runs).toBe(20)
    expect(stats.find(s => s.innings === 2).runs).toBe(30)
  })
})

// ─── deriveBowlingStats ───────────────────────────────────────────────────────

describe('deriveBowlingStats', () => {
  it('returns empty array for no deliveries', () => {
    expect(deriveBowlingStats([])).toEqual([])
  })

  it('counts runs charged to bowler', () => {
    const deliveries = [
      delivery({ batRuns: 4, extraRuns: 0 }),
      delivery({ batRuns: 1, extraRuns: 0 }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.runs).toBe(5)
  })

  it('excludes byes and legbyes from bowler runs', () => {
    const deliveries = [
      delivery({ batRuns: 0, extraRuns: 4, extraType: 'bye' }),
      delivery({ batRuns: 0, extraRuns: 1, extraType: 'legbye' }),
      delivery({ batRuns: 3 }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.runs).toBe(3)
  })

  it('counts wickets (excluding run outs)', () => {
    const deliveries = [
      delivery({ wicket: { type: 'Bowled', outBatsman: 'A', fielder: '' } }),
      delivery({ wicket: { type: 'Run Out', outBatsman: 'B', fielder: '' } }),
      delivery({ wicket: { type: 'Caught', outBatsman: 'C', fielder: 'X' } }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.wickets).toBe(2)
  })

  it('does not count Retired Hurt as a wicket', () => {
    const deliveries = [
      delivery({ wicket: { type: 'Retired Hurt', outBatsman: 'A', fielder: '' } }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.wickets).toBe(0)
  })

  it('counts wides', () => {
    const deliveries = [
      delivery({ extraType: 'wide', extraRuns: 1, isLegalDelivery: false }),
      delivery({ extraType: 'wide', extraRuns: 1, isLegalDelivery: false }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.wides).toBe(2)
  })

  it('counts no-balls', () => {
    const deliveries = [
      delivery({ extraType: 'noball', extraRuns: 1, isLegalDelivery: false }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.noBalls).toBe(1)
  })

  it('calculates over notation correctly for 7 legal balls', () => {
    const deliveries = Array.from({ length: 7 }, () => delivery({ isLegalDelivery: true }))
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.overs).toBe('1.1')
  })

  it('calculates economy rate correctly', () => {
    // 6 legal balls, 6 runs → economy 6.00 (runs per over)
    const deliveries = Array.from({ length: 6 }, () => delivery({ batRuns: 1, isLegalDelivery: true }))
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.economy).toBe('6.00')
  })

  it('returns 0.00 economy when no legal deliveries', () => {
    const deliveries = [delivery({ extraType: 'wide', isLegalDelivery: false })]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.economy).toBe('0.00')
  })

  it('counts maiden overs correctly', () => {
    // 6 legal balls, all dot balls in overNum 0 → maiden
    const deliveries = Array.from({ length: 6 }, () =>
      delivery({ batRuns: 0, extraRuns: 0, overNum: 0 })
    )
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.maidens).toBe(1)
  })

  it('does not count non-maiden overs as maidens', () => {
    const deliveries = [
      ...Array.from({ length: 5 }, () => delivery({ batRuns: 0, extraRuns: 0, overNum: 0 })),
      delivery({ batRuns: 4, overNum: 0 }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(stat.maidens).toBe(0)
  })

  it('calculates bowling average correctly', () => {
    // 6 deliveries × 5 runs + 1 dot-ball wicket = 30 runs, 1 wicket → avg 30
    const deliveries = [
      ...Array.from({ length: 6 }, () => delivery({ batRuns: 5 })),
      delivery({ batRuns: 0, wicket: { type: 'Bowled', outBatsman: 'A', fielder: '' } }),
    ]
    const [stat] = deriveBowlingStats(deliveries)
    expect(Number(stat.average)).toBe(30)
  })

  it('returns N/A average when no wickets taken', () => {
    const [stat] = deriveBowlingStats([delivery()])
    expect(stat.average).toBe('N/A')
  })
})
