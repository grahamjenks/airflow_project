import { defaultTaxSettings, type TaxSettings } from './tax'
import { pensionSourceId } from './types'
import type {
  Assumptions,
  DbScheme,
  DrawdownStrategy,
  OneOffEvent,
  PensionType,
  Person,
  SavingsPot,
  SpendingBand,
} from './types'

const STORAGE_KEY = 'retirement-planner:assumptions:v3'
const LEGACY_V2 = 'retirement-planner:assumptions:v2'
const LEGACY_V1 = 'retirement-planner:assumptions:v1'

export const NO_CONTRIBUTION_LIMIT = 200

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`
}

const num = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

export function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: newId(),
    name: 'Me',
    currentAge: 40,
    retirementAge: 60,
    lifeExpectancy: 90,
    currentAnnualIncome: 45000,
    takeHomePay: 0,
    salaryGrowthRate: 3.5,
    statePensionAge: 67,
    statePensionAnnual: 11500,
    pensionType: 'dc',
    currentPensionPot: 0,
    employeePensionPct: 5,
    employerPensionPct: 5,
    pensionGrowthRate: 5,
    pensionAccessAge: 57,
    dbSchemes: [],
    ...overrides,
  }
}

function makeScheme(overrides: Partial<DbScheme> = {}): DbScheme {
  return {
    id: newId(),
    name: 'Pension scheme',
    accruedAnnualPension: 0,
    accrualRatePct: 2.3,
    accruing: true,
    normalPensionAge: 65,
    followsStatePensionAge: false,
    lumpSum: 0,
    ...overrides,
  }
}

export interface DbSchemePreset {
  label: string
  description: string
  build: () => DbScheme
}

export const dbSchemePresets: DbSchemePreset[] = [
  {
    label: 'Civil Service — Nuvos (preserved)',
    description: 'Closed in 2015. 2.3% accrual, payable at 65. No longer building up.',
    build: () =>
      makeScheme({
        name: 'Nuvos (preserved)',
        accrualRatePct: 2.3,
        accruing: false,
        normalPensionAge: 65,
      }),
  },
  {
    label: 'Civil Service — alpha',
    description: 'From 2015. 2.32% accrual, payable at State Pension Age.',
    build: () =>
      makeScheme({
        name: 'alpha',
        accrualRatePct: 2.32,
        accruing: true,
        followsStatePensionAge: true,
      }),
  },
  {
    label: 'Other career-average scheme',
    description: 'NHS, teachers, local government or similar.',
    build: () => makeScheme({ name: 'Career average scheme', accrualRatePct: 1.85 }),
  },
]

/** A civil servant who moved from Nuvos to alpha in 2015 holds both. */
export function makeNuvosPartner(): Person {
  return makePerson({
    name: 'Partner',
    pensionType: 'db',
    currentPensionPot: 0,
    dbSchemes: [dbSchemePresets[0].build(), dbSchemePresets[1].build()],
  })
}

export function makeDbScheme(overrides: Partial<DbScheme> = {}): DbScheme {
  return makeScheme(overrides)
}

function coerceScheme(raw: unknown, index: number): DbScheme {
  const d = (raw ?? {}) as Partial<DbScheme>
  const base = makeScheme()
  return {
    id: typeof d.id === 'string' && d.id ? d.id : `scheme-${index}-${newId()}`,
    name: typeof d.name === 'string' && d.name ? d.name : `Scheme ${index + 1}`,
    accruedAnnualPension: num(d.accruedAnnualPension, base.accruedAnnualPension),
    accrualRatePct: num(d.accrualRatePct, base.accrualRatePct),
    accruing: d.accruing !== false,
    normalPensionAge: num(d.normalPensionAge, base.normalPensionAge),
    followsStatePensionAge: d.followsStatePensionAge === true,
    lumpSum: num(d.lumpSum, base.lumpSum),
  }
}

export interface PotPreset {
  label: string
  description: string
  defaults: Omit<SavingsPot, 'id' | 'ownerId'>
}

const basePot = {
  balance: 0,
  annualContribution: 0,
  accessibleFromAge: 0,
  accessAtRetirement: false,
  bonusRatePct: 0,
  bonusCapAnnual: 0,
  contributionEndAge: NO_CONTRIBUTION_LIMIT,
  contributionEndsAtRetirement: false,
}

export const potPresets: PotPreset[] = [
  {
    label: 'Cash ISA',
    description: 'Tax-free cash savings, accessible any time.',
    defaults: { ...basePot, name: 'Cash ISA', growthRate: 3 },
  },
  {
    label: 'Stocks & Shares ISA',
    description: 'Tax-free investments, accessible any time.',
    defaults: { ...basePot, name: 'Stocks & Shares ISA', growthRate: 5 },
  },
  {
    label: 'Lifetime ISA (LISA)',
    description: '25% government bonus on up to £4,000/yr. Locked until 60.',
    defaults: {
      ...basePot,
      name: 'Lifetime ISA',
      growthRate: 5,
      annualContribution: 4000,
      accessibleFromAge: 60,
      bonusRatePct: 25,
      bonusCapAnnual: 4000,
      contributionEndAge: 50,
    },
  },
  {
    label: 'General investment account',
    description: 'Taxable investments, accessible any time.',
    defaults: { ...basePot, name: 'General investment account', growthRate: 5 },
  },
  {
    label: 'Cash savings',
    description: 'Everyday savings and emergency fund.',
    defaults: { ...basePot, name: 'Cash savings', growthRate: 2 },
  },
]

function buildDefaults(): Assumptions {
  const me = makePerson({
    id: 'person-me',
    name: 'Me',
    currentAge: 40,
    retirementAge: 60,
    currentAnnualIncome: 50000,
    currentPensionPot: 100000,
  })
  const pots: SavingsPot[] = [
    {
      ...potPresets[0].defaults,
      id: 'pot-cash-isa',
      ownerId: me.id,
      balance: 10000,
      annualContribution: 1500,
    },
    {
      ...potPresets[1].defaults,
      id: 'pot-ss-isa',
      ownerId: me.id,
      balance: 10000,
      annualContribution: 1500,
    },
  ]
  return {
    people: [me],
    pots,
    drawdownStrategy: 'proportional',
    drawdownOrder: [...pots.map((p) => p.id), pensionSourceId(me.id)],
    inflationRate: 2.5,
    tax: { ...defaultTaxSettings },
    livingCostsMonthly: 1500,
    livingCostsAnnualExtras: 4000,
    retirementMonthly: 1900,
    retirementAnnualExtras: 5200,
    spendingChanges: [],
    oneOffEvents: [],
    mortgageAnnualPayment: 12000,
    mortgageYearsRemaining: 15,
  }
}

export const defaultAssumptions: Assumptions = buildDefaults()

function coercePerson(raw: unknown, index: number): Person {
  const p = (raw ?? {}) as Partial<Person>
  const base = makePerson()
  return {
    ...base,
    id: typeof p.id === 'string' && p.id ? p.id : `person-${index}-${newId()}`,
    name: typeof p.name === 'string' && p.name ? p.name : `Person ${index + 1}`,
    currentAge: num(p.currentAge, base.currentAge),
    retirementAge: num(p.retirementAge, base.retirementAge),
    lifeExpectancy: num(p.lifeExpectancy, base.lifeExpectancy),
    currentAnnualIncome: num(p.currentAnnualIncome, base.currentAnnualIncome),
    takeHomePay: num(p.takeHomePay, base.takeHomePay),
    salaryGrowthRate: num(p.salaryGrowthRate, base.salaryGrowthRate),
    statePensionAge: num(p.statePensionAge, base.statePensionAge),
    statePensionAnnual: num(p.statePensionAnnual, base.statePensionAnnual),
    pensionType: (p.pensionType === 'db' ? 'db' : 'dc') as PensionType,
    currentPensionPot: num(p.currentPensionPot, base.currentPensionPot),
    employeePensionPct: num(p.employeePensionPct, base.employeePensionPct),
    employerPensionPct: num(p.employerPensionPct, base.employerPensionPct),
    pensionGrowthRate: num(p.pensionGrowthRate, base.pensionGrowthRate),
    pensionAccessAge: num(p.pensionAccessAge, base.pensionAccessAge),
    dbSchemes: Array.isArray(p.dbSchemes)
      ? p.dbSchemes.map(coerceScheme)
      : legacySchemeFrom(raw),
  }
}

/** Folds the old single-scheme fields into a one-element list. */
function legacySchemeFrom(raw: unknown): DbScheme[] {
  const p = (raw ?? {}) as Record<string, unknown>
  const accrued = num(p.dbAccruedAnnualPension, 0)
  const rate = num(p.dbAccrualRatePct, 0)
  if (accrued <= 0 && rate <= 0) return []
  return [
    coerceScheme(
      {
        name: 'Pension scheme',
        accruedAnnualPension: accrued,
        accrualRatePct: rate || 2.3,
        accruing: true,
        normalPensionAge: num(p.dbNormalPensionAge, 65),
        lumpSum: num(p.dbLumpSum, 0),
      },
      0,
    ),
  ]
}

function coercePot(raw: unknown, index: number, ownerFallback: string): SavingsPot {
  const p = (raw ?? {}) as Partial<SavingsPot>
  const base = potPresets[0].defaults
  return {
    id: typeof p.id === 'string' && p.id ? p.id : `pot-${index}-${newId()}`,
    name: typeof p.name === 'string' && p.name ? p.name : `Pot ${index + 1}`,
    balance: num(p.balance, base.balance),
    annualContribution: num(p.annualContribution, base.annualContribution),
    growthRate: num(p.growthRate, base.growthRate),
    accessibleFromAge: num(p.accessibleFromAge, base.accessibleFromAge),
    accessAtRetirement: p.accessAtRetirement === true,
    bonusRatePct: num(p.bonusRatePct, base.bonusRatePct),
    bonusCapAnnual: num(p.bonusCapAnnual, base.bonusCapAnnual),
    contributionEndAge: num(p.contributionEndAge, base.contributionEndAge),
    contributionEndsAtRetirement: p.contributionEndsAtRetirement === true,
    ownerId: typeof p.ownerId === 'string' && p.ownerId ? p.ownerId : ownerFallback,
  }
}

function coerceBand(raw: unknown, index: number): SpendingBand {
  const b = (raw ?? {}) as Partial<SpendingBand>
  return {
    id: typeof b.id === 'string' && b.id ? b.id : `band-${index}-${newId()}`,
    fromAge: num(b.fromAge, 60),
    amount: num(b.amount, 0),
  }
}

function coerceOneOff(raw: unknown, index: number, potFallback: string): OneOffEvent {
  const e = (raw ?? {}) as Partial<OneOffEvent>
  return {
    id: typeof e.id === 'string' && e.id ? e.id : `oneoff-${index}-${newId()}`,
    name: typeof e.name === 'string' && e.name ? e.name : 'Inheritance',
    atAge: num(e.atAge, 60),
    amount: num(e.amount, 0),
    potId: typeof e.potId === 'string' && e.potId ? e.potId : potFallback,
  }
}

/**
 * Resolves the monthly/extras pair, falling back to an older single annual
 * figure by splitting it into whole months plus the remainder — so the yearly
 * total is preserved exactly across the upgrade.
 */
function splitCosts(
  parsed: Record<string, unknown>,
  monthlyKey: string,
  extrasKey: string,
  legacyAnnualKey: string,
  fallbackMonthly: number,
  fallbackExtras: number,
): { monthly: number; extras: number } {
  const hasNew = typeof parsed[monthlyKey] === 'number' || typeof parsed[extrasKey] === 'number'
  if (hasNew) {
    return {
      monthly: num(parsed[monthlyKey], fallbackMonthly),
      extras: num(parsed[extrasKey], fallbackExtras),
    }
  }
  const legacy = parsed[legacyAnnualKey]
  if (typeof legacy === 'number' && Number.isFinite(legacy)) {
    const monthly = Math.round(legacy / 12)
    return { monthly, extras: Math.max(0, legacy - monthly * 12) }
  }
  return { monthly: fallbackMonthly, extras: fallbackExtras }
}

function coerceTax(raw: unknown): TaxSettings {
  const t = (raw ?? {}) as Partial<TaxSettings>
  return {
    enabled: t.enabled !== false,
    personalAllowance: num(t.personalAllowance, defaultTaxSettings.personalAllowance),
    basicBandWidth: num(t.basicBandWidth, defaultTaxSettings.basicBandWidth),
    basicRatePct: num(t.basicRatePct, defaultTaxSettings.basicRatePct),
    higherBandWidth: num(t.higherBandWidth, defaultTaxSettings.higherBandWidth),
    higherRatePct: num(t.higherRatePct, defaultTaxSettings.higherRatePct),
    additionalRatePct: num(t.additionalRatePct, defaultTaxSettings.additionalRatePct),
    taperThreshold: num(t.taperThreshold, defaultTaxSettings.taperThreshold),
    pensionTaxFreePct: num(t.pensionTaxFreePct, defaultTaxSettings.pensionTaxFreePct),
    taxFreeLumpSumAllowance: num(
      t.taxFreeLumpSumAllowance,
      defaultTaxSettings.taxFreeLumpSumAllowance,
    ),
  }
}

export function coerceAssumptions(raw: unknown): Assumptions {
  const parsed = (raw ?? {}) as Record<string, unknown>
  const fallback = buildDefaults()

  const people = Array.isArray(parsed.people) && parsed.people.length > 0
    ? parsed.people.map(coercePerson)
    : fallback.people
  const ownerFallback = people[0].id
  const validOwners = new Set(people.map((p) => p.id))

  const pots = Array.isArray(parsed.pots)
    ? parsed.pots.map((p, i) => coercePot(p, i, ownerFallback))
    : fallback.pots
  // A pot whose owner was deleted falls back to the first person.
  pots.forEach((pot) => {
    if (!validOwners.has(pot.ownerId)) pot.ownerId = ownerFallback
  })
  const validPots = new Set(pots.map((p) => p.id))

  // Records saved before costs were split carry a single annual figure.
  const working = splitCosts(
    parsed,
    'livingCostsMonthly',
    'livingCostsAnnualExtras',
    'livingCostsAnnual',
    fallback.livingCostsMonthly,
    fallback.livingCostsAnnualExtras,
  )
  const retired = splitCosts(
    parsed,
    'retirementMonthly',
    'retirementAnnualExtras',
    'desiredRetirementIncomeAnnual',
    fallback.retirementMonthly,
    fallback.retirementAnnualExtras,
  )

  return {
    people,
    pots,
    drawdownStrategy:
      parsed.drawdownStrategy === 'priority'
        ? 'priority'
        : ('proportional' as DrawdownStrategy),
    drawdownOrder: Array.isArray(parsed.drawdownOrder)
      ? parsed.drawdownOrder.filter((id): id is string => typeof id === 'string')
      : [...pots.map((p) => p.id), ...people.map((p) => pensionSourceId(p.id))],
    inflationRate: num(parsed.inflationRate, fallback.inflationRate),
    tax: coerceTax(parsed.tax),
    livingCostsMonthly: working.monthly,
    livingCostsAnnualExtras: working.extras,
    retirementMonthly: retired.monthly,
    retirementAnnualExtras: retired.extras,
    spendingChanges: Array.isArray(parsed.spendingChanges)
      ? parsed.spendingChanges.map(coerceBand)
      : [],
    // An event whose pot was deleted falls back to the first pot; with no
    // pots at all there is nowhere for the money to land, so it is dropped.
    oneOffEvents:
      Array.isArray(parsed.oneOffEvents) && pots.length > 0
        ? parsed.oneOffEvents
            .map((e, i) => coerceOneOff(e, i, pots[0].id))
            .map((e) => (validPots.has(e.potId) ? e : { ...e, potId: pots[0].id }))
        : [],
    mortgageAnnualPayment: num(parsed.mortgageAnnualPayment, fallback.mortgageAnnualPayment),
    mortgageYearsRemaining: num(parsed.mortgageYearsRemaining, fallback.mortgageYearsRemaining),
  }
}

/** Folds a single-person v2 record into the new household shape. */
function migrateV2(raw: Record<string, unknown>): Assumptions {
  const me = makePerson({
    id: 'person-me',
    name: 'Me',
    currentAge: num(raw.currentAge, 40),
    retirementAge: num(raw.targetRetirementAge, 60),
    lifeExpectancy: num(raw.lifeExpectancy, 90),
    currentAnnualIncome: num(raw.currentAnnualIncome, 45000),
    salaryGrowthRate: num(raw.salaryGrowthRate, 3.5),
    statePensionAge: num(raw.statePensionAge, 67),
    statePensionAnnual: num(raw.statePensionAnnual, 11500),
    pensionType: 'dc',
    currentPensionPot: num(raw.currentPensionPot, 0),
    employeePensionPct: num(raw.employeePensionPct, 5),
    employerPensionPct: num(raw.employerPensionPct, 5),
    pensionGrowthRate: num(raw.pensionGrowthRate, 5),
    pensionAccessAge: num(raw.pensionAccessAge, 57),
  })

  const rawPots = Array.isArray(raw.pots) ? raw.pots : []
  const pots = rawPots.map((p, i) => coercePot(p, i, me.id))

  // v2 stored the pension as the bare id "pension".
  const order = (Array.isArray(raw.drawdownOrder) ? raw.drawdownOrder : [])
    .filter((id): id is string => typeof id === 'string')
    .map((id) => (id === 'pension' ? pensionSourceId(me.id) : id))

  return coerceAssumptions({
    people: [me],
    pots,
    drawdownStrategy: raw.drawdownStrategy,
    drawdownOrder: order,
    inflationRate: num(raw.inflationRate, 2.5),
    livingCostsAnnual: num(raw.livingCostsAnnual, 22000),
    desiredRetirementIncomeAnnual: num(raw.desiredRetirementIncomeAnnual, 28000),

    spendingChanges: raw.spendingChanges,
    mortgageAnnualPayment: num(raw.mortgageAnnualPayment, 12000),
    mortgageYearsRemaining: num(raw.mortgageYearsRemaining, 15),
  })
}

/** Folds the original v1 record (single savings pot, flat contribution) forward. */
function migrateV1(raw: Record<string, unknown>): Assumptions {
  const income = num(raw.currentAnnualIncome, 45000)
  const oldContribution = num(raw.annualPensionContribution, 0)
  const totalPct = income > 0 ? (oldContribution / income) * 100 : 10
  const half = Math.round((totalPct / 2) * 10) / 10

  return migrateV2({
    ...raw,
    employeePensionPct: half,
    employerPensionPct: half,
    pots: [
      {
        id: newId(),
        name: 'Savings & investments',
        balance: num(raw.currentSavings, 0),
        annualContribution: num(raw.annualSavingsContribution, 0),
        growthRate: num(raw.savingsGrowthRate, 4),
        accessibleFromAge: 0,
        accessAtRetirement: false,
        bonusRatePct: 0,
        bonusCapAnnual: 0,
        contributionEndAge: NO_CONTRIBUTION_LIMIT,
        contributionEndsAtRetirement: false,
      },
    ],
  })
}

export function loadAssumptions(): Assumptions {
  if (typeof window === 'undefined') return defaultAssumptions
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return coerceAssumptions(JSON.parse(raw))

    const v2 = window.localStorage.getItem(LEGACY_V2)
    if (v2) {
      const migrated = migrateV2(JSON.parse(v2))
      saveAssumptions(migrated)
      return migrated
    }
    const v1 = window.localStorage.getItem(LEGACY_V1)
    if (v1) {
      const migrated = migrateV1(JSON.parse(v1))
      saveAssumptions(migrated)
      return migrated
    }
    return defaultAssumptions
  } catch {
    return defaultAssumptions
  }
}

export function saveAssumptions(a: Assumptions): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
  } catch {
    // Storage unavailable (private browsing, quota) — the session still works.
  }
}

export function clearAssumptions(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_V2)
  window.localStorage.removeItem(LEGACY_V1)
}

export function exportAssumptions(a: Assumptions): void {
  const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `retirement-plan-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function importAssumptions(file: File): Promise<Assumptions> {
  const parsed = JSON.parse(await file.text())
  if (parsed && Array.isArray(parsed.people)) return coerceAssumptions(parsed)
  if (parsed && Array.isArray(parsed.pots)) return migrateV2(parsed)
  if (parsed && 'currentSavings' in parsed) return migrateV1(parsed)
  return coerceAssumptions(parsed)
}
