import { grossUpPension, marginalTax, taxFreePart } from './tax'
import { pensionSourceId, personIdFromSource } from './types'
import type {
  Assumptions,
  DbScheme,
  Person,
  PersonYear,
  SavingsPot,
  YearRow,
} from './types'

/** Spendable pay, falling back to gross when no take-home figure is set. */
export function takeHomeBase(person: Person): number {
  return person.takeHomePay > 0 ? person.takeHomePay : Math.max(0, person.currentAnnualIncome)
}

/** The age a defined-benefit tranche starts paying. alpha tracks the SPA. */
export function schemePensionAge(scheme: DbScheme, person: Person): number {
  return scheme.followsStatePensionAge ? person.statePensionAge : scheme.normalPensionAge
}

/**
 * Converts a nominal annual growth rate into a "real" (inflation-adjusted) rate.
 * The whole model runs in today's money: pots grow at their real rate, and
 * living costs, desired income, state pensions, mortgage payments and accrued
 * defined-benefit pensions are treated as holding their real value. Salaries
 * are the exception — each has its own growth rate, so pay can outpace
 * inflation.
 */
export function realRate(nominalPct: number, inflationPct: number): number {
  return (1 + nominalPct / 100) / (1 + inflationPct / 100) - 1
}

export function findPerson(a: Assumptions, id: string): Person | undefined {
  return a.people.find((p) => p.id === id)
}

/** The person whose ages govern a pot's access and contribution rules. */
export function potOwner(a: Assumptions, pot: SavingsPot): Person {
  return findPerson(a, pot.ownerId) ?? a.people[0]
}

/**
 * The age this pot unlocks, in its owner's years. Pots set to follow
 * retirement track whatever retirement age that person is modelled at.
 */
export function effectiveAccessAge(pot: SavingsPot, ownerRetirementAge: number): number {
  return pot.accessAtRetirement ? ownerRetirementAge : pot.accessibleFromAge
}

export function effectiveContributionEndAge(
  pot: SavingsPot,
  ownerRetirementAge: number,
): number {
  return pot.contributionEndsAtRetirement ? ownerRetirementAge : pot.contributionEndAge
}

/** Working-life living costs: regular monthly spend plus yearly extras. */
export function workingCostsAnnual(a: Assumptions): number {
  return Math.max(0, a.livingCostsMonthly) * 12 + Math.max(0, a.livingCostsAnnualExtras)
}

/** Baseline retirement spend: regular monthly spend plus yearly extras. */
export function retirementBaselineAnnual(a: Assumptions): number {
  return Math.max(0, a.retirementMonthly) * 12 + Math.max(0, a.retirementAnnualExtras)
}

/**
 * Planned household spend at a given age of the first person: the baseline,
 * overridden by the latest step-change that has taken effect by then.
 */
export function spendingAtAge(a: Assumptions, age: number): number {
  let amount = retirementBaselineAnnual(a)
  const bands = [...a.spendingChanges].sort((x, y) => x.fromAge - y.fromAge)
  for (const band of bands) {
    if (age >= band.fromAge) amount = band.amount
  }
  return Math.max(0, amount)
}

/**
 * The amount landing in a pot this year, including any government bonus
 * (e.g. a LISA's 25% top-up on the first £4,000).
 */
export function potContributionAt(
  pot: SavingsPot,
  ownerAge: number,
  ownerRetired: boolean,
  ownerRetirementAge: number,
): number {
  if (ownerRetired || ownerAge >= effectiveContributionEndAge(pot, ownerRetirementAge)) return 0
  const contribution = Math.max(0, pot.annualContribution)
  const bonusable = Math.min(contribution, Math.max(0, pot.bonusCapAnnual))
  return contribution + bonusable * (Math.max(0, pot.bonusRatePct) / 100)
}

export function annualPensionContribution(person: Person, salary: number): number {
  if (person.pensionType !== 'dc') return 0
  const pct = Math.max(0, person.employeePensionPct) + Math.max(0, person.employerPensionPct)
  return salary * (pct / 100)
}

/** Every drawable source: savings pots plus each person's DC pension. */
export function allSourceIds(a: Assumptions): string[] {
  return [
    ...a.pots.map((p) => p.id),
    ...a.people.filter((p) => p.pensionType === 'dc').map((p) => pensionSourceId(p.id)),
  ]
}

/**
 * The drawdown priority list, repaired against the current household: stored
 * ids that no longer exist are dropped and anything new is appended, so the
 * stored order stays valid as pots and people are added or removed.
 */
export function resolveDrawdownOrder(a: Assumptions, stored: string[]): string[] {
  const valid = allSourceIds(a)
  const validSet = new Set(valid)
  const order = (stored ?? []).filter((id) => validSet.has(id))
  const seen = new Set(order)
  for (const id of valid) {
    if (!seen.has(id)) {
      order.push(id)
      seen.add(id)
    }
  }
  return order
}

/** Retirement ages actually being modelled — overridden for one person when scanning. */
export interface RetirementOverride {
  personId: string
  retirementAge: number
}

function retirementAgeFor(person: Person, override?: RetirementOverride): number {
  return override && override.personId === person.id ? override.retirementAge : person.retirementAge
}

/**
 * Simulates the household year by year, in today's money.
 *
 * Each year: salaries, state pensions and defined-benefit pensions are counted
 * as income; anything the household still needs is drawn from savings pots and
 * DC pensions that are unlocked at that point.
 */
export function simulate(a: Assumptions, override?: RetirementOverride): YearRow[] {
  const rows: YearRow[] = []
  if (a.people.length === 0) return rows

  const currentYear = new Date().getFullYear()
  const potGrowth = a.pots.map((p) => realRate(p.growthRate, a.inflationRate))
  const order = resolveDrawdownOrder(a, a.drawdownOrder)
  const potIndexById = new Map(a.pots.map((p, i) => [p.id, i]))

  const retirementAges = new Map(
    a.people.map((p) => [p.id, retirementAgeFor(p, override)] as const),
  )

  // Run to the last year anyone is expected to be alive.
  const horizon = Math.max(
    ...a.people.map((p) => Math.max(0, p.lifeExpectancy - p.currentAge)),
    ...a.people.map((p) => Math.max(0, (retirementAges.get(p.id) ?? p.retirementAge) - p.currentAge)),
  )

  let balances = a.pots.map((p) => Math.max(0, p.balance))
  const pensionPots = new Map(
    a.people.map((p) => [p.id, p.pensionType === 'dc' ? Math.max(0, p.currentPensionPot) : 0]),
  )
  // Accrued annual pension per scheme, keyed "<personId>:<schemeId>".
  const dbAccrued = new Map<string, number>()
  a.people.forEach((p) => {
    if (p.pensionType !== 'db') return
    p.dbSchemes.forEach((sch) => {
      dbAccrued.set(`${p.id}:${sch.id}`, Math.max(0, sch.accruedAnnualPension))
    })
  })
  const lumpSumPaid = new Set<string>()
  // Tax-free pension cash is capped over a lifetime, so it carries across years.
  const taxFreeUsed = new Map<string, number>(a.people.map((p) => [p.id, 0]))

  for (let t = 0; t <= horizon; t++) {
    const anchorAge = a.people[0].currentAge + t
    const mortgageActive = t < a.mortgageYearsRemaining
    const mortgagePayment = mortgageActive ? Math.max(0, a.mortgageAnnualPayment) : 0

    const accessAges = a.pots.map((pot) => {
      const owner = potOwner(a, pot)
      return effectiveAccessAge(pot, retirementAges.get(owner.id) ?? owner.retirementAge)
    })
    const potOwnerAges = a.pots.map((pot) => potOwner(a, pot).currentAge + t)

    // --- Income and contributions for each person ---
    const peopleYears: PersonYear[] = []
    let salaryTotal = 0
    let grossSalaryTotal = 0
    let statePensionTotal = 0
    let dbIncomeTotal = 0
    let householdRetired = true

    for (const person of a.people) {
      const age = person.currentAge + t
      const retireAt = retirementAges.get(person.id) ?? person.retirementAge
      const retired = age >= retireAt
      if (!retired) householdRetired = false

      const realSalaryGrowth = realRate(person.salaryGrowthRate, a.inflationRate)
      const growth = (1 + realSalaryGrowth) ** t
      // Gross drives pension accrual and contribution percentages; take-home is
      // what the household can actually spend.
      const salary = retired ? 0 : Math.max(0, person.currentAnnualIncome) * growth
      const takeHome = retired ? 0 : takeHomeBase(person) * growth
      grossSalaryTotal += salary
      salaryTotal += takeHome

      const statePension =
        age >= person.statePensionAge ? Math.max(0, person.statePensionAnnual) : 0
      statePensionTotal += statePension

      // Defined contribution: grow the pot and add contributions.
      let pensionContribution = 0
      if (person.pensionType === 'dc') {
        const realGrowth = realRate(person.pensionGrowthRate, a.inflationRate)
        pensionContribution = retired ? 0 : annualPensionContribution(person, salary)
        pensionPots.set(
          person.id,
          (pensionPots.get(person.id) ?? 0) * (1 + realGrowth) + pensionContribution,
        )
      }

      // Defined benefit: each tranche accrues and pays on its own rules.
      let dbIncome = 0
      const schemeYears: PersonYear['dbSchemes'] = []
      if (person.pensionType === 'db') {
        for (const scheme of person.dbSchemes) {
          const key = `${person.id}:${scheme.id}`
          if (scheme.accruing && !retired) {
            dbAccrued.set(
              key,
              (dbAccrued.get(key) ?? 0) + salary * (Math.max(0, scheme.accrualRatePct) / 100),
            )
          }
          const accrued = dbAccrued.get(key) ?? 0
          let income = 0
          if (age >= schemePensionAge(scheme, person)) {
            income = accrued
            if (!lumpSumPaid.has(key) && scheme.lumpSum > 0) {
              lumpSumPaid.add(key)
              const target = balances.findIndex((_b, i) => potOwnerAges[i] >= accessAges[i])
              if (target >= 0) balances[target] += scheme.lumpSum
            }
          }
          dbIncome += income
          schemeYears.push({ id: scheme.id, name: scheme.name, accrued, income })
        }
      }
      dbIncomeTotal += dbIncome

      peopleYears.push({
        id: person.id,
        name: person.name,
        age,
        retired,
        salary,
        takeHome,
        pensionContribution,
        pensionPot: pensionPots.get(person.id) ?? 0,
        pensionWithdrawal: 0,
        dbSchemes: schemeYears,
        dbIncome,
        statePension,
        taxPaid: 0,
        taxablePensionWithdrawal: 0,
      })
    }

    // --- Pot contributions ---
    const potContributions = a.pots.map((pot, i) => {
      const owner = potOwner(a, pot)
      const retireAt = retirementAges.get(owner.id) ?? owner.retirementAge
      return potContributionAt(pot, potOwnerAges[i], potOwnerAges[i] >= retireAt, retireAt)
    })
    // Snapshot before growth so the table can reconcile:
    // start + interest + contributions - withdrawals = end.
    const potStartBalances = [...balances]
    const potInterest = balances.map((b, i) => b * potGrowth[i])
    balances = balances.map((b, i) => b + potInterest[i] + potContributions[i])

    // --- Spending, tax, and the gap to fill ---
    // Salaries are entered as take-home, so only pension income is taxed here.
    // ISA and savings withdrawals are returns of capital and stay untaxed.
    const spending = householdRetired ? spendingAtAge(a, anchorAge) : workingCostsAnnual(a)
    const outgoings = spending + mortgagePayment
    const guaranteedIncome = salaryTotal + statePensionTotal + dbIncomeTotal

    // Running taxable total per person, so each further withdrawal is charged
    // at the right band rather than a flat average rate.
    const taxBase = new Map<string, number>()
    const personTax = new Map<string, number>()
    const taxableDrawn = new Map<string, number>()
    let taxTotal = 0

    for (const py of peopleYears) {
      const pensionIncome = py.statePension + py.dbIncome
      const tax = marginalTax(py.salary, pensionIncome, a.tax)
      taxBase.set(py.id, py.salary + pensionIncome)
      personTax.set(py.id, tax)
      taxableDrawn.set(py.id, 0)
      taxTotal += tax
    }

    // What the household can actually spend before touching any pot.
    const netGuaranteed = guaranteedIncome - taxTotal
    const netNeed = outgoings - netGuaranteed

    const potTaken = new Array<number>(balances.length).fill(0)
    const pensionTaken = new Map<string, number>()
    let withdrawal = 0
    let netDelivered = 0
    let shortfall = 0
    let blockedByLock = false

    /** Draws gross from a DC pot, returning the spendable amount after tax. */
    const drawPension = (personId: string, grossWanted: number): number => {
      const available = pensionPots.get(personId) ?? 0
      const gross = Math.min(available, grossWanted)
      if (gross <= 0) return 0
      const base = taxBase.get(personId) ?? 0
      const freeRemaining = Math.max(
        0,
        a.tax.taxFreeLumpSumAllowance - (taxFreeUsed.get(personId) ?? 0),
      )
      const free = taxFreePart(gross, a.tax, freeRemaining)
      const taxable = gross - free
      taxFreeUsed.set(personId, (taxFreeUsed.get(personId) ?? 0) + free)
      const extraTax = marginalTax(base, taxable, a.tax)
      pensionPots.set(personId, available - gross)
      pensionTaken.set(personId, (pensionTaken.get(personId) ?? 0) + gross)
      taxableDrawn.set(personId, (taxableDrawn.get(personId) ?? 0) + taxable)
      taxBase.set(personId, base + taxable)
      personTax.set(personId, (personTax.get(personId) ?? 0) + extraTax)
      taxTotal += extraTax
      withdrawal += gross
      const net = gross - extraTax
      netDelivered += net
      return net
    }

    /** Savings pots are tax-free, so gross and net are the same. */
    const drawPot = (i: number, wanted: number): number => {
      const take = Math.min(balances[i], Math.max(0, wanted))
      if (take <= 0) return 0
      balances[i] -= take
      potTaken[i] += take
      withdrawal += take
      netDelivered += take
      return take
    }

    if (netNeed > 0) {
      const openPots = a.pots
        .map((_p, i) => (potOwnerAges[i] >= accessAges[i] ? i : -1))
        .filter((i) => i >= 0)
      const openPensions = a.people.filter(
        (p) => p.pensionType === 'dc' && p.currentAge + t >= p.pensionAccessAge,
      )

      if (a.drawdownStrategy === 'priority') {
        let remaining = netNeed
        for (const id of order) {
          if (remaining <= 0.01) break
          const personId = personIdFromSource(id)
          if (personId) {
            const person = findPerson(a, personId)
            if (!person || person.pensionType !== 'dc') continue
            if (person.currentAge + t < person.pensionAccessAge) continue
            const base = taxBase.get(personId) ?? 0
            const freeLeft = Math.max(
              0,
              a.tax.taxFreeLumpSumAllowance - (taxFreeUsed.get(personId) ?? 0),
            )
            remaining -= drawPension(
              personId,
              grossUpPension(remaining, base, a.tax, freeLeft),
            )
            continue
          }
          const i = potIndexById.get(id)
          if (i === undefined || potOwnerAges[i] < accessAges[i]) continue
          remaining -= drawPot(i, remaining)
        }
      } else {
        // Split the net need across sources by balance share. A pension share
        // needs grossing up, and a capped source leaves a remainder, so repeat
        // over whatever still has a balance.
        let remaining = netNeed
        for (let pass = 0; pass < 4 && remaining > 0.01; pass++) {
          const potShare = openPots.map((i) => balances[i])
          const pensionShare = openPensions.map((p) => pensionPots.get(p.id) ?? 0)
          const total =
            potShare.reduce((sm, v) => sm + v, 0) + pensionShare.reduce((sm, v) => sm + v, 0)
          if (total <= 0.01) break
          const want = remaining
          let got = 0
          openPots.forEach((i, k) => {
            got += drawPot(i, want * (potShare[k] / total))
          })
          openPensions.forEach((p, k) => {
            const netWanted = want * (pensionShare[k] / total)
            const base = taxBase.get(p.id) ?? 0
            const freeLeft = Math.max(
              0,
              a.tax.taxFreeLumpSumAllowance - (taxFreeUsed.get(p.id) ?? 0),
            )
            got += drawPension(p.id, grossUpPension(netWanted, base, a.tax, freeLeft))
          })
          if (got <= 0.01) break
          remaining -= got
        }
      }

      if (netNeed - netDelivered > 0.01) {
        shortfall = netNeed - netDelivered
        const lockedNow =
          balances.reduce((sm, b, i) => (potOwnerAges[i] < accessAges[i] ? sm + b : sm), 0) +
          a.people.reduce(
            (sm, p) =>
              p.pensionType === 'dc' && p.currentAge + t < p.pensionAccessAge
                ? sm + (pensionPots.get(p.id) ?? 0)
                : sm,
            0,
          )
        blockedByLock = lockedNow > 0.01
      }
    }

    balances = balances.map((b) => Math.max(0, b))

    // Fold the final pot/pension state back into this year's person records.
    for (const py of peopleYears) {
      py.pensionPot = Math.max(0, pensionPots.get(py.id) ?? 0)
      py.pensionWithdrawal = pensionTaken.get(py.id) ?? 0
      py.taxPaid = personTax.get(py.id) ?? 0
      py.taxablePensionWithdrawal = taxableDrawn.get(py.id) ?? 0
    }

    const potsTotal = balances.reduce((s, b) => s + b, 0)
    const pensionsTotal = peopleYears.reduce((s, p) => s + p.pensionPot, 0)
    const lockedBalance =
      balances.reduce((s, b, i) => (potOwnerAges[i] < accessAges[i] ? s + b : s), 0) +
      peopleYears.reduce((s, py) => {
        const person = findPerson(a, py.id)
        if (!person || person.pensionType !== 'dc') return s
        return py.age < person.pensionAccessAge ? s + py.pensionPot : s
      }, 0)

    rows.push({
      year: currentYear + t,
      t,
      age: anchorAge,
      people: peopleYears,
      potStartBalances,
      potInterest,
      potBalances: [...balances],
      potWithdrawals: potTaken,
      potContributions,
      potsTotal,
      pensionsTotal,
      totalPot: potsTotal + pensionsTotal,
      lockedBalance,
      salaryTotal,
      grossSalaryTotal,
      statePensionTotal,
      dbIncomeTotal,
      guaranteedIncome,
      taxPaid: taxTotal,
      netIncome: guaranteedIncome + withdrawal - taxTotal,
      mortgagePayment,
      mortgageActive,
      outgoings,
      householdRetired,
      withdrawal,
      shortfall,
      depleted: shortfall > 0.01,
      blockedByLock,
    })
  }

  return rows
}

export interface RetirementSearchResult {
  earliestAge: number | null
  searchedUpTo: number
}

/**
 * Earliest retirement age for one person — everyone else keeps their own
 * planned retirement age — at which the household never falls short.
 */
export function findEarliestRetirementAge(
  a: Assumptions,
  personId: string,
  maxAge = 85,
): RetirementSearchResult {
  const person = findPerson(a, personId)
  if (!person) return { earliestAge: null, searchedUpTo: maxAge }

  const minAge = person.currentAge + 1
  const cappedMax = Math.max(minAge, maxAge)

  for (let candidate = minAge; candidate <= cappedMax; candidate++) {
    const rows = simulate(a, { personId, retirementAge: candidate })
    if (!rows.some((r) => r.depleted)) return { earliestAge: candidate, searchedUpTo: cappedMax }
  }
  return { earliestAge: null, searchedUpTo: cappedMax }
}

export function firstShortfallRow(rows: YearRow[]): YearRow | null {
  return rows.find((r) => r.depleted) ?? null
}

/**
 * The first year every drawable pot is empty — savings and DC pensions all
 * spent. Guaranteed income (state and salary-based pensions) carries on, so
 * this is not necessarily the year the plan fails.
 */
export function potsExhaustedRow(rows: YearRow[]): YearRow | null {
  return rows.find((r) => r.t > 0 && r.totalPot < 1) ?? null
}

/**
 * The year every locked source has become reachable — the latest pot access
 * age or DC pension access age. Shortfalls before this are a bridging problem
 * (the money exists but can't be touched); after it they mean the money has
 * genuinely run out.
 */
export function fullAccessOffset(a: Assumptions): number {
  const offsets: number[] = [0]
  a.pots.forEach((pot) => {
    const owner = potOwner(a, pot)
    offsets.push(effectiveAccessAge(pot, owner.retirementAge) - owner.currentAge)
  })
  a.people.forEach((p) => {
    if (p.pensionType === 'dc') offsets.push(p.pensionAccessAge - p.currentAge)
  })
  return Math.max(...offsets, 0)
}

export interface ShortfallSummary {
  total: number
  beforeUnlock: number
  afterUnlock: number
  unlockAge: number | null
  unlockYear: number | null
  yearsShort: number
}

/** Total shortfall across the plan, split either side of everything unlocking. */
export function shortfallSummary(a: Assumptions, rows: YearRow[]): ShortfallSummary {
  const offset = fullAccessOffset(a)
  let beforeUnlock = 0
  let afterUnlock = 0
  let yearsShort = 0
  for (const r of rows) {
    if (r.shortfall <= 0.01) continue
    yearsShort++
    if (r.t < offset) beforeUnlock += r.shortfall
    else afterUnlock += r.shortfall
  }
  const anchor = a.people[0]
  return {
    total: beforeUnlock + afterUnlock,
    beforeUnlock,
    afterUnlock,
    unlockAge: anchor ? anchor.currentAge + offset : null,
    unlockYear: rows.length > 0 ? rows[0].year + offset : null,
    yearsShort,
  }
}

/** The largest annual shortfall across the plan. */
export function worstShortfallRow(rows: YearRow[]): YearRow | null {
  let worst: YearRow | null = null
  for (const r of rows) {
    if (r.shortfall > 0.01 && (!worst || r.shortfall > worst.shortfall)) worst = r
  }
  return worst
}

/** The first year money is actually drawn from pots or DC pensions. */
export function drawdownStartRow(rows: YearRow[]): YearRow | null {
  return rows.find((r) => r.withdrawal > 0.01) ?? null
}

/** Points where a pot or a pension becomes reachable, labelled for the charts. */
export function unlockEvents(a: Assumptions): { t: number; label: string }[] {
  const events: { t: number; label: string }[] = []

  a.pots.forEach((pot) => {
    const owner = potOwner(a, pot)
    const access = effectiveAccessAge(pot, owner.retirementAge)
    const t = access - owner.currentAge
    if (t > 0) events.push({ t, label: pot.name })
  })

  a.people.forEach((person) => {
    if (person.pensionType === 'dc') {
      const t = person.pensionAccessAge - person.currentAge
      if (t > 0) events.push({ t, label: `${person.name}'s pension` })
    } else {
      person.dbSchemes.forEach((scheme) => {
        const t = schemePensionAge(scheme, person) - person.currentAge
        if (t > 0) events.push({ t, label: `${person.name}: ${scheme.name}` })
      })
    }
  })

  return events.sort((x, y) => x.t - y.t)
}
