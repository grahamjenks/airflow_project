const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatCurrencyCompact(value: number): string {
  return compactCurrencyFormatter.format(value)
}

/** Monthly equivalent of an annual figure, for costs people think of per month. */
export function formatMonthly(annual: number): string {
  return formatCurrency(annual / 12)
}
