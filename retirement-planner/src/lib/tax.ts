/**
 * UK income tax, applied to pension income only.
 *
 * Salaries are entered as take-home, so their tax is already accounted for.
 * What still needs taxing in this model is pension income: the state pension,
 * defined-benefit pensions, and the taxable share of DC drawdown. ISA and
 * general savings withdrawals are returns of capital and are not taxed here.
 */
export interface TaxSettings {
  enabled: boolean
  /** Tax-free personal allowance. */
  personalAllowance: number
  /** Taxable income taxed at the basic rate (£37,700 in 2024/25). */
  basicBandWidth: number
  basicRatePct: number
  /**
   * Taxable income taxed at the higher rate. The additional rate starts at
   * £125,140 of taxable income, so this band is £125,140 − £37,700 wide.
   */
  higherBandWidth: number
  higherRatePct: number
  additionalRatePct: number
  /** Income above which the personal allowance tapers away. */
  taperThreshold: number
  /** Share of each DC pension withdrawal taken tax-free (25% in the UK). */
  pensionTaxFreePct: number
  /**
   * Lifetime cap on tax-free pension cash — the UK Lump Sum Allowance,
   * £268,275. Once used up, every further withdrawal is fully taxable.
   */
  taxFreeLumpSumAllowance: number
}

export const defaultTaxSettings: TaxSettings = {
  enabled: true,
  personalAllowance: 12570,
  basicBandWidth: 37700,
  basicRatePct: 20,
  higherBandWidth: 87440,
  higherRatePct: 40,
  additionalRatePct: 45,
  taperThreshold: 100000,
  pensionTaxFreePct: 25,
  taxFreeLumpSumAllowance: 268275,
}

/** Personal allowance after the £1-for-every-£2 taper above the threshold. */
export function allowanceFor(income: number, t: TaxSettings): number {
  const over = Math.max(0, income - t.taperThreshold)
  return Math.max(0, t.personalAllowance - over / 2)
}

/** Income tax due on a total income, in today's money. */
export function incomeTax(income: number, t: TaxSettings): number {
  if (!t.enabled || income <= 0) return 0
  const taxable = Math.max(0, income - allowanceFor(income, t))
  let tax = 0
  const basic = Math.min(taxable, t.basicBandWidth)
  tax += basic * (t.basicRatePct / 100)
  const higher = Math.min(Math.max(0, taxable - t.basicBandWidth), t.higherBandWidth)
  tax += higher * (t.higherRatePct / 100)
  const additional = Math.max(0, taxable - t.basicBandWidth - t.higherBandWidth)
  tax += additional * (t.additionalRatePct / 100)
  return tax
}

/**
 * Extra tax caused by adding `addition` on top of income already being taxed —
 * the marginal cost, so each source is charged at the right band.
 */
export function marginalTax(base: number, addition: number, t: TaxSettings): number {
  if (!t.enabled || addition <= 0) return 0
  return incomeTax(base + addition, t) - incomeTax(base, t)
}

/** Tax-free slice of a withdrawal, limited by what's left of the allowance. */
export function taxFreePart(gross: number, t: TaxSettings, freeRemaining: number): number {
  if (!t.enabled) return gross
  return Math.min(gross * (t.pensionTaxFreePct / 100), Math.max(0, freeRemaining))
}

/** Spendable amount left from a gross DC pension withdrawal. */
export function netFromPensionGross(
  gross: number,
  base: number,
  t: TaxSettings,
  freeRemaining = Number.POSITIVE_INFINITY,
): number {
  if (gross <= 0) return 0
  if (!t.enabled) return gross
  const taxable = gross - taxFreePart(gross, t, freeRemaining)
  return gross - marginalTax(base, taxable, t)
}

/**
 * Gross DC withdrawal needed to leave `net` in hand. Tax is piecewise linear
 * and monotonic, so a bisection converges quickly and copes with band changes
 * mid-withdrawal without any algebra per band.
 */
export function grossUpPension(
  net: number,
  base: number,
  t: TaxSettings,
  freeRemaining = Number.POSITIVE_INFINITY,
): number {
  if (net <= 0) return 0
  if (!t.enabled) return net
  let low = net
  let high = net * 2 + 1000
  // Expand until the bracket definitely covers the answer.
  while (netFromPensionGross(high, base, t, freeRemaining) < net && high < 1e9) high *= 2
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    if (netFromPensionGross(mid, base, t, freeRemaining) < net) low = mid
    else high = mid
  }
  return high
}

/**
 * Employee National Insurance, 2024/25 thresholds and rates. Deliberately not
 * user-configurable: these exist only to estimate take-home pay from gross,
 * and anyone needing an exact figure can type their own payslip number.
 */
const NI_PRIMARY_THRESHOLD = 12570
const NI_UPPER_LIMIT = 50270
const NI_MAIN_RATE = 8
const NI_UPPER_RATE = 2

/** Employee National Insurance due on a salary, in today's money. */
export function nationalInsurance(gross: number): number {
  if (gross <= NI_PRIMARY_THRESHOLD) return 0
  const main = Math.min(gross, NI_UPPER_LIMIT) - NI_PRIMARY_THRESHOLD
  const upper = Math.max(0, gross - NI_UPPER_LIMIT)
  return main * (NI_MAIN_RATE / 100) + upper * (NI_UPPER_RATE / 100)
}

export interface TakeHomeEstimate {
  gross: number
  pensionContribution: number
  incomeTax: number
  nationalInsurance: number
  takeHome: number
}

/**
 * Estimated pay reaching the bank. Pension contributions come out first — a
 * net-pay or salary-sacrifice arrangement, which is how workplace schemes
 * normally run — so income tax and NI are charged on what is left.
 *
 * With tax modelling switched off, only the pension contribution is deducted,
 * so the one switch keeps one meaning: model UK deductions, or don't.
 */
export function estimateTakeHome(
  gross: number,
  pensionContributionPct: number,
  t: TaxSettings,
): TakeHomeEstimate {
  const g = Math.max(0, gross)
  const pensionContribution = g * (Math.max(0, pensionContributionPct) / 100)
  const afterPension = g - pensionContribution
  const tax = t.enabled ? incomeTax(afterPension, t) : 0
  const ni = t.enabled ? nationalInsurance(afterPension) : 0
  return {
    gross: g,
    pensionContribution,
    incomeTax: tax,
    nationalInsurance: ni,
    takeHome: Math.max(0, afterPension - tax - ni),
  }
}
