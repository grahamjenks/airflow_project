import { describe, it, expect } from 'vitest'
import { buildInningsProgression } from './MatchCharts'

// Minimal delivery factory — mirrors the shape LiveScorecard records.
function ball(over, { innings = 1, team = 'A', bat = 0, extra = 0, extraType = null, wicket = null } = {}) {
  return {
    innings, overNum: over, battingTeam: team,
    batRuns: bat, extraRuns: extra, extraType,
    isLegalDelivery: extraType !== 'wide' && extraType !== 'noball',
    wicket,
  }
}

describe('buildInningsProgression', () => {
  it('returns empty structure for no deliveries', () => {
    const r = buildInningsProgression([])
    expect(r.inningsNums).toEqual([])
    expect(r.worm).toEqual([])
    expect(r.manhattan).toEqual({})
  })

  it('buckets runs per over and accumulates them for the worm', () => {
    const deliveries = [
      ball(0, { bat: 4 }), ball(0, { bat: 2 }),          // over 1: 6
      ball(1, { bat: 1 }), ball(1, { bat: 0 }),          // over 2: 1
      ball(2, { bat: 6 }),                                // over 3: 6
    ]
    const r = buildInningsProgression(deliveries)
    expect(r.inningsNums).toEqual([1])
    expect(r.teamByInnings[1]).toBe('A')
    // Manhattan: runs per over
    expect(r.manhattan[1].map(x => x.runs)).toEqual([6, 1, 6])
    // Worm: leading 0 then cumulative 6, 7, 13
    expect(r.worm.map(x => x.i1)).toEqual([0, 6, 7, 13])
  })

  it('counts wickets per over and flags them on the worm', () => {
    const deliveries = [
      ball(0, { bat: 1 }),
      ball(0, { wicket: { type: 'Bowled', outBatsman: 'X' } }),   // wicket in over 1
      ball(1, { bat: 2 }),
    ]
    const r = buildInningsProgression(deliveries)
    expect(r.manhattan[1][0].wkts).toBe(1)
    expect(r.manhattan[1][1].wkts).toBe(0)
    // Over-1 worm row (index 1, after the leading zero) carries a wicket marker
    const overOne = r.worm[1]
    expect(overOne.i1w).toBe(overOne.i1)   // marker equals cumulative runs there
    expect(r.worm[2].i1w).toBeNull()        // no wicket in over 2
  })

  it('includes extras in the over total but ignores penalty rows and retirements', () => {
    const deliveries = [
      ball(0, { bat: 1, extra: 1, extraType: 'wide' }),           // counts: 2
      ball(0, { extraType: 'penalty', extra: 5 }),                // ignored
      { innings: 1, overNum: 0, battingTeam: 'A', isRetirement: true, batRuns: 0, extraRuns: 0 }, // ignored
    ]
    const r = buildInningsProgression(deliveries)
    expect(r.manhattan[1][0].runs).toBe(2)
    expect(r.worm.map(x => x.i1)).toEqual([0, 2])
  })

  it('handles two innings with a shared over axis', () => {
    const deliveries = [
      ball(0, { innings: 1, team: 'A', bat: 3 }),
      ball(1, { innings: 1, team: 'A', bat: 2 }),
      ball(0, { innings: 2, team: 'B', bat: 5 }),
    ]
    const r = buildInningsProgression(deliveries)
    expect(r.inningsNums).toEqual([1, 2])
    expect(r.teamByInnings).toEqual({ 1: 'A', 2: 'B' })
    expect(r.maxOver).toBe(2)
    // Innings 2 only has over 1, so its later over is null (line stops)
    const lastRow = r.worm[r.worm.length - 1]
    expect(lastRow.i1).toBe(5)     // A: 3 + 2
    expect(lastRow.i2).toBeNull()  // B has no over-2 data
  })
})
