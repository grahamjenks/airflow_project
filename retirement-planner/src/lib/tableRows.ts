import { effectiveAccessAge, potOwner, schemePensionAge } from './projection'
import type { Assumptions, YearRow } from './types'

/**
 * Years worth showing even in the condensed view: the start and end of the
 * projection, each retirement, each state pension, and every unlock point.
 */
export function milestoneYears(a: Assumptions, rows: YearRow[]): Set<number> {
  const set = new Set<number>()
  if (rows.length > 0) {
    set.add(rows[0].t)
    set.add(rows[rows.length - 1].t)
  }
  a.people.forEach((p) => {
    set.add(p.retirementAge - p.currentAge)
    set.add(p.statePensionAge - p.currentAge)
    if (p.pensionType === 'dc') set.add(p.pensionAccessAge - p.currentAge)
    else p.dbSchemes.forEach((s) => set.add(schemePensionAge(s, p) - p.currentAge))
  })
  a.pots.forEach((pot) => {
    const owner = potOwner(a, pot)
    set.add(effectiveAccessAge(pot, owner.retirementAge) - owner.currentAge)
  })
  // A lump sum arriving or leaving is always worth a row of its own.
  a.oneOffEvents.forEach((event) => set.add(event.atAge - a.people[0].currentAge))
  return set
}

export function selectRows(
  rows: YearRow[],
  everyYear: boolean,
  milestones: Set<number>,
): YearRow[] {
  return rows.filter((r) => everyYear || r.t % 5 === 0 || milestones.has(r.t))
}

/** Short label for what changes in this year, e.g. "Ann retires · Pension starts". */
export function eventNoteFor(a: Assumptions, row: YearRow): string | null {
  const notes: string[] = []
  a.people.forEach((p) => {
    const age = p.currentAge + row.t
    if (age === p.retirementAge) notes.push(`${p.name} retires`)
    if (age === p.statePensionAge) notes.push(`${p.name}: state pension`)
    if (p.pensionType === 'dc' && age === p.pensionAccessAge) {
      notes.push(`${p.name}: pension unlocks`)
    }
    if (p.pensionType === 'db') {
      p.dbSchemes.forEach((scheme) => {
        if (age === schemePensionAge(scheme, p)) notes.push(`${p.name}: ${scheme.name} starts`)
      })
    }
  })
  a.pots.forEach((pot) => {
    const owner = potOwner(a, pot)
    const access = effectiveAccessAge(pot, owner.retirementAge)
    const t = access - owner.currentAge
    if (t === row.t && t > 0) notes.push(`${pot.name} unlocks`)
  })
  a.oneOffEvents.forEach((event) => {
    if (event.atAge === row.age) notes.push(event.name)
  })
  return notes.length > 0 ? notes.join(' · ') : null
}
