import { formatCurrency } from '../lib/format'
import { useState } from 'react'
import { realRate, takeHomeEstimateFor } from '../lib/projection'
import { dbSchemePresets, makeNuvosPartner } from '../lib/storage'
import type { DbScheme, Person } from '../lib/types'
import type { TaxSettings } from '../lib/tax'
import { NumberField } from './NumberField'
import { SliderField } from './SliderField'

interface PeopleEditorProps {
  people: Person[]
  inflationRate: number
  tax: TaxSettings
  onChange: (people: Person[]) => void
}

export function PeopleEditor({ people, inflationRate, tax, onChange }: PeopleEditorProps) {
  function update(id: string, patch: Partial<Person>) {
    onChange(people.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function addPartner() {
    onChange([...people, makeNuvosPartner()])
  }

  function remove(id: string) {
    if (people.length <= 1) return
    onChange(people.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-4">
      {people.map((person, i) => (
        <PersonCard
          key={person.id}
          person={person}
          inflationRate={inflationRate}
          tax={tax}
          canRemove={people.length > 1 && i > 0}
          onChange={(patch) => update(person.id, patch)}
          onRemove={() => remove(person.id)}
        />
      ))}

      {people.length < 2 && (
        <button
          type="button"
          onClick={addPartner}
          className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          + Add a partner
        </button>
      )}
    </div>
  )
}

interface PersonCardProps {
  person: Person
  inflationRate: number
  tax: TaxSettings
  canRemove: boolean
  onChange: (patch: Partial<Person>) => void
  onRemove: () => void
}

function PersonCard({
  person,
  inflationRate,
  tax,
  canRemove,
  onChange,
  onRemove,
}: PersonCardProps) {
  const isDb = person.pensionType === 'db'
  const estimate = takeHomeEstimateFor(person, tax)

  function updateScheme(id: string, patch: Partial<DbScheme>) {
    onChange({
      dbSchemes: person.dbSchemes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={person.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent text-sm font-semibold text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:text-slate-100"
          aria-label="Name"
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
            aria-label={`Remove ${person.name}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Current age"
          value={person.currentAge}
          onChange={(v) => onChange({ currentAge: v })}
          min={16}
          max={100}
        />
        <NumberField
          label="Retirement age"
          value={person.retirementAge}
          onChange={(v) => onChange({ retirementAge: v })}
          min={person.currentAge}
          max={85}
        />
        <NumberField
          label="Gross salary"
          value={person.currentAnnualIncome}
          onChange={(v) => onChange({ currentAnnualIncome: v })}
          prefix="£"
          step={500}
          hint="Drives pension accrual."
        />
        <NumberField
          label="Life expectancy"
          value={person.lifeExpectancy}
          onChange={(v) => onChange({ lifeExpectancy: v })}
          min={person.retirementAge}
          max={110}
        />
      </div>

      <div className="mt-3">
        <NumberField
          label="Take-home pay"
          value={person.takeHomePay}
          onChange={(v) => onChange({ takeHomePay: v })}
          prefix="£"
          step={500}
          hint={
            person.takeHomePay > 0
              ? 'Your own figure — annual pay after tax, NI and pension contributions.'
              : 'Leave at 0 to use the estimate below, or enter the figure from your payslip.'
          }
        />
        {person.takeHomePay === 0 && (
          <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Estimated <strong>{formatCurrency(estimate.takeHome)}</strong> a year ·{' '}
            {formatCurrency(estimate.gross)} gross
            {estimate.pensionContribution > 0 && (
              <> − {formatCurrency(estimate.pensionContribution)} pension</>
            )}
            {tax.enabled ? (
              <>
                {' '}
                − {formatCurrency(estimate.incomeTax)} tax −{' '}
                {formatCurrency(estimate.nationalInsurance)} NI
              </>
            ) : (
              <> · income tax is switched off, so none is deducted</>
            )}
            .
            {isDb && (
              <>
                {' '}
                Contributions to a salary-based scheme aren't modelled, so this is on the
                generous side — enter your payslip figure to be exact.
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <SliderField
          label="Salary growth"
          value={person.salaryGrowthRate}
          onChange={(v) => onChange({ salaryGrowthRate: v })}
          min={0}
          max={10}
          step={0.1}
          hint={`Nominal. Above ${inflationRate}% inflation means real-terms pay rises.`}
        />
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-600">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Pension type</span>
        <div className="mt-1.5 flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
          {(
            [
              ['dc', 'Pot (workplace / SIPP)'],
              ['db', 'Salary-based (DB)'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ pensionType: value })}
              className={`flex-1 px-2 py-1.5 text-xs font-medium ${
                person.pensionType === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isDb ? (
        <div className="mt-3 space-y-3">
          <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Defined-benefit schemes pay a guaranteed income for life — there is no pot, so nothing
            can be drawn early or run out. Add one entry per scheme: a civil servant who moved to
            alpha in 2015 holds preserved Nuvos <em>and</em> alpha, payable at different ages.
          </p>

          {person.dbSchemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              person={person}
              onChange={(patch) => updateScheme(scheme.id, patch)}
              onRemove={() =>
                onChange({ dbSchemes: person.dbSchemes.filter((s) => s.id !== scheme.id) })
              }
            />
          ))}

          <AddSchemeButton
            onAdd={(scheme) => onChange({ dbSchemes: [...person.dbSchemes, scheme] })}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <NumberField
            label="Current pension pot"
            value={person.currentPensionPot}
            onChange={(v) => onChange({ currentPensionPot: v })}
            prefix="£"
            step={1000}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Own contribution"
              value={person.employeePensionPct}
              onChange={(v) => onChange({ employeePensionPct: v })}
              suffix="%"
              step={0.5}
              max={100}
            />
            <NumberField
              label="Employer"
              value={person.employerPensionPct}
              onChange={(v) => onChange({ employerPensionPct: v })}
              suffix="%"
              step={0.5}
              max={100}
            />
          </div>
          <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {person.employeePensionPct + person.employerPensionPct}% of{' '}
            {formatCurrency(person.currentAnnualIncome)} ={' '}
            <strong>
              {formatCurrency(
                person.currentAnnualIncome *
                  ((person.employeePensionPct + person.employerPensionPct) / 100),
              )}
            </strong>{' '}
            a year, rising with salary.
          </p>
          <SliderField
            label="Expected growth"
            value={person.pensionGrowthRate}
            onChange={(v) => onChange({ pensionGrowthRate: v })}
            min={0}
            max={12}
            step={0.1}
            hint={`${(realRate(person.pensionGrowthRate, inflationRate) * 100).toFixed(2)}% a year after ${inflationRate}% inflation — the rate actually used.`}
          />
          <NumberField
            label="Pension access age"
            value={person.pensionAccessAge}
            onChange={(v) => onChange({ pensionAccessAge: v })}
            min={40}
            max={80}
            hint="Currently 55 in the UK, rising to 57 in 2028."
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
        <NumberField
          label="State pension age"
          value={person.statePensionAge}
          onChange={(v) => onChange({ statePensionAge: v })}
          min={person.currentAge}
          max={80}
        />
        <NumberField
          label="State pension"
          value={person.statePensionAnnual}
          onChange={(v) => onChange({ statePensionAnnual: v })}
          prefix="£"
          step={100}
        />
      </div>
    </div>
  )
}

interface SchemeCardProps {
  scheme: DbScheme
  person: Person
  onChange: (patch: Partial<DbScheme>) => void
  onRemove: () => void
}

function SchemeCard({ scheme, person, onChange, onRemove }: SchemeCardProps) {
  const payAge = scheme.followsStatePensionAge ? person.statePensionAge : scheme.normalPensionAge
  const accrualThisYear = scheme.accruing
    ? person.currentAnnualIncome * (scheme.accrualRatePct / 100)
    : 0

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-2.5 dark:border-violet-900 dark:bg-violet-950/20">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          value={scheme.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent text-sm font-semibold text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:text-slate-100"
          aria-label="Scheme name"
        />
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
          aria-label={`Remove ${scheme.name}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <NumberField
        label="Pension built up so far (per year)"
        value={scheme.accruedAnnualPension}
        onChange={(v) => onChange({ accruedAnnualPension: v })}
        prefix="£"
        step={250}
        hint={
          scheme.accruedAnnualPension > 0
            ? "From the annual benefit statement, in today's money."
            : 'Still zero, so this scheme shows nothing in the tables or charts. Copy the figure from your annual benefit statement.'
        }
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <NumberField
          label="Accrual rate"
          value={scheme.accrualRatePct}
          onChange={(v) => onChange({ accrualRatePct: v })}
          suffix="%"
          step={0.01}
          max={10}
          disabled={!scheme.accruing}
        />
        <NumberField
          label="Paid from age"
          value={payAge}
          onChange={(v) => onChange({ normalPensionAge: v })}
          min={50}
          max={75}
          disabled={scheme.followsStatePensionAge}
        />
      </div>

      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={scheme.accruing}
          onChange={(e) => onChange({ accruing: e.target.checked })}
          className="h-3.5 w-3.5 rounded accent-blue-600"
        />
        Still building up (untick for a preserved scheme like Nuvos)
      </label>

      <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={scheme.followsStatePensionAge}
          onChange={(e) => onChange({ followsStatePensionAge: e.target.checked })}
          className="h-3.5 w-3.5 rounded accent-blue-600"
        />
        Pension age follows State Pension Age ({person.statePensionAge}) — alpha
      </label>

      <p className="mt-2 rounded-md bg-white/70 px-2 py-1.5 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        {scheme.accruing ? (
          <>
            Adds {scheme.accrualRatePct}% of salary ={' '}
            <strong>{formatCurrency(accrualThisYear)}</strong>/yr for each year worked.
          </>
        ) : (
          <>Preserved — no longer building up.</>
        )}{' '}
        Paid from age <strong>{payAge}</strong>.
      </p>

      <div className="mt-2">
        <NumberField
          label="Tax-free lump sum"
          value={scheme.lumpSum}
          onChange={(v) => onChange({ lumpSum: v })}
          prefix="£"
          step={1000}
          hint="Leave at 0 if none is taken."
        />
      </div>
    </div>
  )
}

function AddSchemeButton({ onAdd }: { onAdd: (scheme: DbScheme) => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
      >
        + Add a pension scheme
      </button>
    )
  }
  return (
    <div className="space-y-1 rounded-lg border border-slate-200 p-2 dark:border-slate-600">
      {dbSchemePresets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => {
            onAdd(preset.build())
            setOpen(false)
          }}
          className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
            {preset.label}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {preset.description}
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-1 w-full rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        Cancel
      </button>
    </div>
  )
}
