export interface SavingsPot {
  id: string
  name: string
  balance: number
  annualContribution: number
  growthRate: number // nominal annual %
  /** Age from which this pot can be drawn on. LISAs are locked until 60. */
  accessibleFromAge: number
  /** When true, `accessibleFromAge` is ignored and tracks the retirement age. */
  accessAtRetirement: boolean
  /** Government top-up on contributions, e.g. 25 for a LISA. */
  bonusRatePct: number
  /** Contribution ceiling the bonus applies to, e.g. £4,000 for a LISA. */
  bonusCapAnnual: number
  /** Age at which contributions must stop, e.g. 50 for a LISA. */
  contributionEndAge: number
  /** When true, `contributionEndAge` is ignored and tracks the retirement age. */
  contributionEndsAtRetirement: boolean
  /** Whose age governs the access and contribution ages above. */
  ownerId: string
}

/**
 * Defined contribution builds a pot you draw down. Defined benefit (e.g. the
 * Civil Service Nuvos scheme) builds an annual income paid from a set age —
 * there is no pot, so it can never be drawn on early or run out.
 */
export type PensionType = 'dc' | 'db'

/**
 * One tranche of defined-benefit pension. Someone can hold several with
 * different rules — a civil servant moved from Nuvos to alpha in 2015 keeps
 * preserved Nuvos benefits payable at 65 alongside alpha accruing to their
 * State Pension Age.
 */
export interface DbScheme {
  id: string
  name: string
  /** Annual pension already built up in this scheme, in today's money. */
  accruedAnnualPension: number
  /** Share of salary added each year. Nuvos 2.3%, alpha 2.32%. */
  accrualRatePct: number
  /** False for a preserved scheme that no longer builds up. */
  accruing: boolean
  /** Age the pension starts. Ignored when `followsStatePensionAge` is set. */
  normalPensionAge: number
  /** alpha's pension age tracks the State Pension Age. */
  followsStatePensionAge: boolean
  /** One-off tax-free lump sum paid when the pension starts. */
  lumpSum: number
}

export interface Person {
  id: string
  name: string
  currentAge: number
  retirementAge: number
  lifeExpectancy: number

  /** Gross salary — drives pension accrual and contribution percentages. */
  currentAnnualIncome: number
  /**
   * Annual pay actually reaching the bank, after tax, NI and pension
   * contributions. This is what the household can spend. 0 means "same as
   * gross", which overstates spendable income.
   */
  takeHomePay: number
  salaryGrowthRate: number // nominal annual %

  statePensionAge: number
  statePensionAnnual: number

  pensionType: PensionType

  // --- Defined contribution ---
  currentPensionPot: number
  employeePensionPct: number
  employerPensionPct: number
  pensionGrowthRate: number // nominal annual %
  pensionAccessAge: number

  // --- Defined benefit (career average, e.g. Nuvos and alpha) ---
  dbSchemes: DbScheme[]
}

/** How each year's income shortfall is taken from the available sources. */
export type DrawdownStrategy = 'proportional' | 'priority'

/** Identifies a person's DC pension within `Assumptions.drawdownOrder`. */
export function pensionSourceId(personId: string): string {
  return `pension:${personId}`
}

export function personIdFromSource(sourceId: string): string | null {
  return sourceId.startsWith('pension:') ? sourceId.slice('pension:'.length) : null
}

/**
 * A one-off lump sum moving in or out of a savings pot at a set age — an
 * inheritance or a windfall coming in, a gift or a big one-time cost going
 * out. Unlike a spending change it happens once, in a single year.
 */
export interface OneOffEvent {
  id: string
  name: string
  /** Age of the first person in the year it happens. */
  atAge: number
  /** Positive money in, negative money out. */
  amount: number
  /** The pot it lands in, or is taken from. */
  potId: string
}

/**
 * A change in planned household spending at a given age of the first person.
 */
export interface SpendingBand {
  id: string
  fromAge: number
  amount: number
}

import type { TaxSettings } from './tax'

export interface Assumptions {
  /** Everyone in the household. The first person anchors the age axis. */
  people: Person[]

  /** Savings and investments, shared across the household. */
  pots: SavingsPot[]

  drawdownStrategy: DrawdownStrategy
  /** Source ids in priority order — pot ids plus `pension:<personId>`. */
  drawdownOrder: string[]

  inflationRate: number // nominal annual %

  /** Income tax applied to pension income (salaries are entered net). */
  tax: TaxSettings

  // Shared household spending, in today's money.
  // Regular costs are entered monthly; one-off yearly items (holidays,
  // renovations) are entered as an annual figure on top.
  livingCostsMonthly: number
  livingCostsAnnualExtras: number
  retirementMonthly: number
  retirementAnnualExtras: number
  /** Later step-changes, expressed as a total for the year. */
  spendingChanges: SpendingBand[]

  /** One-off lump sums in or out of a pot, e.g. an inheritance or a gift. */
  oneOffEvents: OneOffEvent[]

  mortgageAnnualPayment: number
  mortgageYearsRemaining: number
}

/** One person's position in a given projection year. */
export interface PersonYear {
  id: string
  name: string
  age: number
  retired: boolean
  /** Gross pay this year. */
  salary: number
  /** Spendable pay this year, after tax, NI and pension contributions. */
  takeHome: number
  /** DC only: paid in this year. */
  pensionContribution: number
  /** DC only: pot balance after growth and any withdrawal. */
  pensionPot: number
  /** DC only: taken from the pot this year. */
  pensionWithdrawal: number
  /** DB only: per-scheme position this year. */
  dbSchemes: { id: string; name: string; accrued: number; income: number }[]
  /** DB only: total pension being paid this year. */
  dbIncome: number
  statePension: number
  /** Income tax due on this person's pension income this year. */
  taxPaid: number
  /** Gross DC withdrawal that was taxable (the non tax-free share). */
  taxablePensionWithdrawal: number
}

export interface YearRow {
  /** Calendar year. */
  year: number
  /** Years from now (0 = this year). */
  t: number
  /** Age of the first person, used for age-based labelling and spending bands. */
  age: number
  people: PersonYear[]

  /** Pot balance at the start of the year, before growth and contributions. */
  potStartBalances: number[]
  /** Growth earned on the starting balance this year. */
  potInterest: number[]
  /** Pot balance at the end of the year. */
  potBalances: number[]
  potWithdrawals: number[]
  potContributions: number[]
  /** One-off lump sums applied this year: positive in, negative out. */
  potOneOffs: number[]
  potsTotal: number

  /** Combined DC pension pots. */
  pensionsTotal: number
  totalPot: number
  /** Portion of `totalPot` not accessible this year. */
  lockedBalance: number

  /** Combined take-home pay — the part of salary the household can spend. */
  salaryTotal: number
  /** Combined gross pay, for reference. */
  grossSalaryTotal: number
  statePensionTotal: number
  dbIncomeTotal: number
  /** Salary + state pensions + DB pensions, before any drawdown. */
  guaranteedIncome: number
  /** Total income tax across the household this year. */
  taxPaid: number
  /** Gross income less tax — what's actually available to spend. */
  netIncome: number

  mortgagePayment: number
  mortgageActive: boolean
  outgoings: number
  /** True once every person has passed their retirement age. */
  householdRetired: boolean

  withdrawal: number
  shortfall: number
  depleted: boolean
  blockedByLock: boolean
}
