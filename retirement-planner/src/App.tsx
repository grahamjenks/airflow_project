import { useMemo, useRef, useState } from 'react'
import { BalancesTable } from './components/BalancesTable'
import { ContributionsChart } from './components/ContributionsChart'
import { DrawdownOrder } from './components/DrawdownOrder'
import { IncomeChart } from './components/IncomeChart'
import { IncomeTable } from './components/IncomeTable'
import { InputSection } from './components/InputSection'
import { NumberField } from './components/NumberField'
import { PeopleEditor } from './components/PeopleEditor'
import { PotsEditor } from './components/PotsEditor'
import { SliderField } from './components/SliderField'
import { SpendingSchedule } from './components/SpendingSchedule'
import { SpendingSummary } from './components/SpendingSummary'
import { SummaryCard } from './components/SummaryCard'
import { WealthChart, type WealthChartMode } from './components/WealthChart'
import { formatCurrency, formatMonthly } from './lib/format'
import {
  drawdownStartRow,
  findEarliestRetirementAge,
  firstShortfallRow,
  potsExhaustedRow,
  realRate,
  retirementBaselineAnnual,
  shortfallSummary,
  simulate,
  unlockEvents,
  workingCostsAnnual,
  worstShortfallRow,
} from './lib/projection'
import {
  clearAssumptions,
  defaultAssumptions,
  exportAssumptions,
  importAssumptions,
  loadAssumptions,
  saveAssumptions,
} from './lib/storage'
import type { Assumptions } from './lib/types'

function useAssumptions() {
  const [assumptions, setAssumptions] = useState<Assumptions>(() => loadAssumptions())

  function update<K extends keyof Assumptions>(key: K, value: Assumptions[K]) {
    setAssumptions((prev) => {
      const next = { ...prev, [key]: value }
      saveAssumptions(next)
      return next
    })
  }

  function replaceAll(next: Assumptions) {
    setAssumptions(next)
    saveAssumptions(next)
  }

  return { assumptions, update, replaceAll }
}

function StrategyBadge({ strategy }: { strategy: Assumptions['drawdownStrategy'] }) {
  const priority = strategy === 'priority'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        priority
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
      }`}
      title="Set this under 'Drawdown order' in the sidebar"
    >
      {priority ? 'Drawn in your set order' : 'Drawn from all pots at once'}
    </span>
  )
}

function App() {
  const { assumptions: a, update, replaceAll } = useAssumptions()
  const [importError, setImportError] = useState<string | null>(null)
  const [chartMode, setChartMode] = useState<WealthChartMode>('stacked')
  const [showInputs, setShowInputs] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => simulate(a), [a])
  const shortfall = useMemo(() => firstShortfallRow(rows), [rows])
  const drawdownRow = useMemo(() => drawdownStartRow(rows), [rows])
  const exhausted = useMemo(() => potsExhaustedRow(rows), [rows])
  const finalRow = rows.length > 0 ? rows[rows.length - 1] : null
  const worstShortfall = useMemo(() => worstShortfallRow(rows), [rows])
  const shortfallTotals = useMemo(() => shortfallSummary(a, rows), [a, rows])
  const unlocks = useMemo(() => unlockEvents(a), [a])
  const primary = a.people[0]
  const earliest = useMemo(
    () => findEarliestRetirementAge(a, primary.id),
    [a, primary.id],
  )

  const mortgagePaidOffYear = new Date().getFullYear() + a.mortgageYearsRemaining
  const retirementRow = rows.find((r) => r.householdRetired) ?? null
  const potAtRetirement = retirementRow?.totalPot ?? 0
  const lockedAtRetirement = retirementRow?.lockedBalance ?? 0

  const guaranteedInRetirement = useMemo(() => {
    // Guaranteed income once every pension is in payment.
    const last = rows[rows.length - 1]
    return last ? last.statePensionTotal + last.dbIncomeTotal : 0
  }, [rows])


  function handleReset() {
    if (!confirm('Reset all inputs to the default example and erase your saved data on this device?'))
      return
    clearAssumptions()
    replaceAll(defaultAssumptions)
  }

  async function handleImportFile(file: File) {
    setImportError(null)
    try {
      replaceAll(await importAssumptions(file))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Retirement Planner</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Household plan — all figures in today's money, after {a.inflationRate}% inflation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInputs((v) => !v)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {showInputs ? '◀ Hide inputs' : '▶ Show inputs'}
            </button>
            <button
              type="button"
              onClick={() => exportAssumptions(a)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Export backup
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Import backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
            >
              Reset
            </button>
          </div>
        </div>
        {importError && (
          <div className="mx-auto max-w-[1800px] px-4 pb-3">
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              {importError}
            </p>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside
          className={`w-full shrink-0 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:w-96 ${
            showInputs ? '' : 'hidden'
          }`}
        >
          <InputSection title={`People (${a.people.length})`}>
            <PeopleEditor
              people={a.people}
              inflationRate={a.inflationRate}
              onChange={(people) => update('people', people)}
            />
          </InputSection>

          <InputSection title="Household spending">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter regular costs monthly, then add yearly one-offs like holidays and renovations on
              top.
            </p>

            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
              <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                While anyone is still working
                {retirementRow && (
                  <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                    — until {retirementRow.year}
                  </span>
                )}
              </p>
              <div className="space-y-3">
                <NumberField
                  label="Regular monthly costs"
                  value={a.livingCostsMonthly}
                  onChange={(v) => update('livingCostsMonthly', v)}
                  prefix="£"
                  step={50}
                  hint="Food, utilities, transport, subscriptions."
                />
                <NumberField
                  label="Yearly extras"
                  value={a.livingCostsAnnualExtras}
                  onChange={(v) => update('livingCostsAnnualExtras', v)}
                  prefix="£"
                  step={250}
                  hint="Holidays, renovations, one-off costs."
                />
              </div>
              <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Total <strong>{formatCurrency(workingCostsAnnual(a))}</strong> a year ·{' '}
                {formatMonthly(workingCostsAnnual(a))} a month
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
              <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                Once everyone has retired
                {retirementRow && (
                  <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                    — from {retirementRow.year}
                  </span>
                )}
              </p>
              <div className="space-y-3">
                <NumberField
                  label="Regular monthly costs"
                  value={a.retirementMonthly}
                  onChange={(v) => update('retirementMonthly', v)}
                  prefix="£"
                  step={50}
                />
                <NumberField
                  label="Yearly extras"
                  value={a.retirementAnnualExtras}
                  onChange={(v) => update('retirementAnnualExtras', v)}
                  prefix="£"
                  step={250}
                  hint="Holidays, replacing the car, and so on."
                />
              </div>
              <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Total <strong>{formatCurrency(retirementBaselineAnnual(a))}</strong> a year ·{' '}
                {formatMonthly(retirementBaselineAnnual(a))} a month.{' '}
                {retirementRow ? (
                  <>
                    Starts <strong>{retirementRow.year}</strong>, when{' '}
                    {a.people.length > 1 ? 'the last of you stops work' : 'you stop work'} (
                    {retirementRow.people.map((p) => `${p.name} ${p.age}`).join(', ')}). Until then
                    the working figure applies, even if one of you has already retired.
                  </>
                ) : (
                  <>Nobody retires within the plan, so this never applies.</>
                )}
              </p>
            </div>
          </InputSection>

          <InputSection
            title={`Spending changes (${a.spendingChanges.length})`}
            defaultOpen={a.spendingChanges.length > 0}
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step spending up or down at set ages of {primary.name}.
            </p>
            <SpendingSchedule
              baseAmount={retirementBaselineAnnual(a)}
              retirementAge={primary.retirementAge}
              lifeExpectancy={primary.lifeExpectancy}
              changes={a.spendingChanges}
              onChange={(changes) => update('spendingChanges', changes)}
            />
          </InputSection>

          <InputSection title={`Savings pots (${a.pots.length})`}>
            <PotsEditor assumptions={a} onChange={(pots) => update('pots', pots)} />
          </InputSection>

          <InputSection title="Drawdown order">
            <DrawdownOrder
              assumptions={a}
              onStrategyChange={(strategy) => update('drawdownStrategy', strategy)}
              onOrderChange={(order) => update('drawdownOrder', order)}
            />
          </InputSection>

          <InputSection title="Income tax" defaultOpen={false}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={a.tax.enabled}
                onChange={(e) => update('tax', { ...a.tax, enabled: e.target.checked })}
                className="h-4 w-4 rounded accent-blue-600"
              />
              Apply income tax to pension income
            </label>
            <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              State pensions, salary-based pensions and pension drawdown are taxable, so drawdown is
              grossed up to leave enough after tax. <strong>ISA and savings withdrawals aren't
              taxed.</strong> Salaries aren't taxed here either — you enter those as take-home.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Personal allowance"
                value={a.tax.personalAllowance}
                onChange={(v) => update('tax', { ...a.tax, personalAllowance: v })}
                prefix="£"
                step={100}
              />
              <NumberField
                label="Tax-free from pot"
                value={a.tax.pensionTaxFreePct}
                onChange={(v) => update('tax', { ...a.tax, pensionTaxFreePct: v })}
                suffix="%"
                max={100}
                hint="25% in the UK."
              />
              <NumberField
                label="Basic rate"
                value={a.tax.basicRatePct}
                onChange={(v) => update('tax', { ...a.tax, basicRatePct: v })}
                suffix="%"
                max={100}
              />
              <NumberField
                label="Higher rate"
                value={a.tax.higherRatePct}
                onChange={(v) => update('tax', { ...a.tax, higherRatePct: v })}
                suffix="%"
                max={100}
              />
            </div>
            <NumberField
              label="Lifetime cap on tax-free cash"
              value={a.tax.taxFreeLumpSumAllowance}
              onChange={(v) => update('tax', { ...a.tax, taxFreeLumpSumAllowance: v })}
              prefix="£"
              step={1000}
              hint="UK Lump Sum Allowance is £268,275. Beyond it, drawdown is fully taxable."
            />
            <p className="text-xs text-slate-400">
              Rates are England, Wales and Northern Ireland. Scottish rates differ. The tax-free
              share is modelled as {a.tax.pensionTaxFreePct}% of each withdrawal, not a single
              lump sum taken up front.
            </p>
          </InputSection>

          <InputSection title="Mortgage">
            <NumberField
              label="Current annual mortgage payment"
              value={a.mortgageAnnualPayment}
              onChange={(v) => update('mortgageAnnualPayment', v)}
              prefix="£"
              step={100}
              hint={`${formatMonthly(a.mortgageAnnualPayment)} a month`}
            />
            <NumberField
              label="Years remaining"
              value={a.mortgageYearsRemaining}
              onChange={(v) => update('mortgageYearsRemaining', v)}
              min={0}
              max={40}
              hint={`Paid off in ${mortgagePaidOffYear}.`}
            />
          </InputSection>

          <InputSection title="Inflation & today's money">
            <SliderField
              label="Inflation"
              value={a.inflationRate}
              onChange={(v) => update('inflationRate', v)}
              min={0}
              max={8}
              step={0.1}
            />
            <div className="space-y-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <p>
                <strong>Every figure is in today's money.</strong> A pound in 2050 buys what a pound
                buys now, so you can judge whether an income is enough without mentally discounting
                it.
              </p>
              <p>
                Growth rates are entered as you'd see them quoted (nominal), then reduced by
                inflation. At {a.inflationRate}% inflation a{' '}
                <strong>5% return grows a pot by {(realRate(5, a.inflationRate) * 100).toFixed(2)}%
                </strong>{' '}
                a year in real terms — which is why the Interest column looks smaller than the rate
                you typed.
              </p>
              <p>
                Salaries have their own growth rate, so pay can outpace inflation. Everything else —
                living costs, target income, state and salary-based pensions, mortgage payments — is
                assumed to rise with inflation, so it holds its value here.
              </p>
            </div>
          </InputSection>

          <div className="px-4 py-4">
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              🔒 Your numbers stay on this device — everything is stored only in this browser's local
              storage. Nothing is sent to a server.
            </p>
          </div>
        </aside>

        <section className="flex-1 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              label={`${primary.name}: earliest retirement`}
              value={earliest.earliestAge ?? '85+'}
              tone={earliest.earliestAge ? 'good' : 'bad'}
              sub={
                earliest.earliestAge
                  ? 'Household income needs met for life.'
                  : `Still falls short retiring at ${earliest.searchedUpTo}.`
              }
            />
            <SummaryCard
              label="Total shortfall"
              value={shortfall ? formatCurrency(shortfallTotals.total) : 'None'}
              tone={shortfall ? 'bad' : 'good'}
              sub={
                shortfall ? (
                  <>
                    Before {shortfallTotals.unlockAge}:{' '}
                    <strong>{formatCurrency(shortfallTotals.beforeUnlock)}</strong> · from{' '}
                    {shortfallTotals.unlockAge}:{' '}
                    <strong>{formatCurrency(shortfallTotals.afterUnlock)}</strong>
                    <br />
                    {shortfallTotals.yearsShort} short years · worst{' '}
                    {formatCurrency(worstShortfall?.shortfall ?? 0)} in {shortfall.year}
                  </>
                ) : (
                  'Income needs met every year.'
                )
              }
            />
            <SummaryCard
              label="Pots run dry"
              value={exhausted ? `Age ${exhausted.people[0].age}` : 'Never'}
              tone={exhausted ? 'warn' : 'good'}
              sub={
                exhausted
                  ? `${exhausted.year} — ${exhausted.people
                      .map((p) => `${p.name} ${p.age}`)
                      .join(', ')}`
                  : 'Savings and pensions outlast the plan.'
              }
            />
            <SummaryCard
              label="Pots when all retired"
              value={formatCurrency(potAtRetirement)}
              sub={
                lockedAtRetirement > 0
                  ? `${formatCurrency(lockedAtRetirement)} still locked then`
                  : 'Pensions + all savings pots'
              }
            />
            <SummaryCard
              label="Pension pot remaining"
              value={formatCurrency(finalRow?.pensionsTotal ?? 0)}
              tone={(finalRow?.pensionsTotal ?? 0) > 0 ? 'good' : 'warn'}
              sub={
                finalRow
                  ? `At ${finalRow.year} (${finalRow.people
                      .map((p) => `${p.name} ${p.age}`)
                      .join(', ')}) · savings ${formatCurrency(finalRow.potsTotal)}`
                  : undefined
              }
            />
            <SummaryCard
              label="Guaranteed income for life"
              value={formatCurrency(guaranteedInRetirement)}
              sub="State + salary-based pensions"
            />
          </div>

          <SpendingSummary assumptions={a} rows={rows} />

          {shortfall && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {shortfall.blockedByLock ? (
                <>
                  In <strong>{shortfall.year}</strong> the household is short{' '}
                  <strong>{formatCurrency(shortfall.shortfall)}</strong>. There is still{' '}
                  {formatCurrency(shortfall.lockedBalance)} saved, but it's locked at that point.
                </>
              ) : (
                <>
                  In <strong>{shortfall.year}</strong> the money runs out — short{' '}
                  <strong>{formatCurrency(shortfall.shortfall)}</strong> that year.
                </>
              )}{' '}
              {earliest.earliestAge && (
                <>
                  {primary.name} retiring at <strong>{earliest.earliestAge}</strong> would clear it on
                  these assumptions.
                </>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">Wealth over time</h2>
              <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                {(['stacked', 'lines'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setChartMode(m)}
                    className={`px-2.5 py-1 text-xs font-medium ${
                      chartMode === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {m === 'stacked' ? 'Stacked total' : 'Compare pots'}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Pots and DC pensions only — salary-based pensions pay an income and hold no balance.
            </p>
            <WealthChart
              assumptions={a}
              rows={rows}
              shortfallYear={shortfall?.year ?? null}
              drawdownYear={drawdownRow?.year ?? null}
              unlocks={unlocks}
              mode={chartMode}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-1 text-sm font-semibold">Income vs outgoings</h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Where household income comes from each year — drawdown bars are coloured by the pot
              funding them. Bars show <strong>gross</strong> amounts, so in retirement they sit above
              the outgoings line by the income tax due; hover for the tax and after-tax figures.
              Mortgage ends {mortgagePaidOffYear}.
            </p>
            <IncomeChart assumptions={a} rows={rows} drawdownYear={drawdownRow?.year ?? null} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-1 text-sm font-semibold">Contributions by pot</h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              What goes into savings each year, split by destination. Pot colours match the other
              charts, and the stack steps down as each person stops working. LISA figures include the
              government bonus.
            </p>
            <ContributionsChart assumptions={a} rows={rows} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <IncomeTable
              assumptions={a}
              rows={rows}
              title="Income by source"
              badge={<StrategyBadge strategy={a.drawdownStrategy} />}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <BalancesTable
              assumptions={a}
              rows={rows}
              title="Pot balances by year"
              badge={<StrategyBadge strategy={a.drawdownStrategy} />}
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-[1800px] px-4 pb-8 text-center text-xs text-slate-400">
        A planning estimate, not financial advice. Salary-based (defined benefit) pensions are
        modelled as a guaranteed income from their pension age; career-average schemes accrue a share
        of salary each year worked. Tax, survivor benefits and any reduction in spending after a
        first death are not modelled.
      </footer>
    </div>
  )
}

export default App
