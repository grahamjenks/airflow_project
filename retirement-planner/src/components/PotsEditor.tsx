import { useState } from 'react'
import { formatCurrency } from '../lib/format'
import {
  effectiveAccessAge,
  effectiveContributionEndAge,
  potContributionAt,
  realRate,
  resolveDrawdownOrder,
} from '../lib/projection'
import type { Assumptions, Person } from '../lib/types'
import { NO_CONTRIBUTION_LIMIT, newId, potPresets } from '../lib/storage'
import type { SavingsPot } from '../lib/types'
import { NumberField } from './NumberField'
import { POT_COLORS } from './chartColors'

interface PotsEditorProps {
  assumptions: Assumptions
  onChange: (pots: SavingsPot[]) => void
}

export function PotsEditor({ assumptions: a, onChange }: PotsEditorProps) {
  const pots = a.pots
  const order = resolveDrawdownOrder(a, a.drawdownOrder)
  const [adding, setAdding] = useState(false)

  function updatePot(id: string, patch: Partial<SavingsPot>) {
    onChange(pots.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removePot(id: string) {
    onChange(pots.filter((p) => p.id !== id))
  }

  function addPreset(index: number) {
    onChange([
      ...pots,
      { ...potPresets[index].defaults, id: newId(), ownerId: a.people[0].id },
    ])
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      {pots.map((pot, i) => (
        <PotCard
          key={pot.id}
          pot={pot}
          color={POT_COLORS[i % POT_COLORS.length]}
          people={a.people}
          inflationRate={a.inflationRate}
          drawdownPosition={
            a.drawdownStrategy === 'priority' ? order.indexOf(pot.id) + 1 : null
          }
          onChange={(patch) => updatePot(pot.id, patch)}
          onRemove={() => removePot(pot.id)}
        />
      ))}

      {pots.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-600">
          No savings pots yet. Add one below.
        </p>
      )}

      {adding ? (
        <div className="space-y-1 rounded-lg border border-slate-200 p-2 dark:border-slate-600">
          {potPresets.map((preset, i) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => addPreset(i)}
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
            onClick={() => setAdding(false)}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          + Add savings pot
        </button>
      )}
    </div>
  )
}

interface PotCardProps {
  pot: SavingsPot
  color: string
  people: Person[]
  inflationRate: number
  drawdownPosition: number | null
  onChange: (patch: Partial<SavingsPot>) => void
  onRemove: () => void
}

function PotCard({
  pot,
  color,
  people,
  inflationRate,
  drawdownPosition,
  onChange,
  onRemove,
}: PotCardProps) {
  const realGrowthPct = realRate(pot.growthRate, inflationRate) * 100
  const [showAdvanced, setShowAdvanced] = useState(false)
  const owner = people.find((p) => p.id === pot.ownerId) ?? people[0]
  const currentAge = owner.currentAge
  const retirementAge = owner.retirementAge
  const accessAge = effectiveAccessAge(pot, retirementAge)
  const endAge = effectiveContributionEndAge(pot, retirementAge)
  const locked = accessAge > currentAge
  const grossContribution = potContributionAt(pot, currentAge, false, retirementAge)
  const bonus = grossContribution - pot.annualContribution
  const contributionsCapped = endAge < NO_CONTRIBUTION_LIMIT
  const contributionsEnded = currentAge >= endAge

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <input
          type="text"
          value={pot.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent text-sm font-semibold text-slate-800 hover:border-slate-300 focus:border-blue-500 focus:outline-none dark:text-slate-100"
          aria-label="Pot name"
        />
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
          aria-label={`Remove ${pot.name}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {people.length > 1 && (
        <label className="mb-3 block">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Age rules follow
          </span>
          <select
            value={pot.ownerId}
            onChange={(e) => onChange({ ownerId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Balance"
          value={pot.balance}
          onChange={(v) => onChange({ balance: v })}
          prefix="£"
          step={500}
        />
        <NumberField
          label="Per year"
          value={pot.annualContribution}
          onChange={(v) => onChange({ annualContribution: v })}
          prefix="£"
          step={250}
        />
        <NumberField
          label="Growth %"
          value={pot.growthRate}
          onChange={(v) => onChange({ growthRate: v })}
          suffix="%"
          step={0.1}
          max={15}
          hint={`${realGrowthPct.toFixed(2)}% real`}
        />
        <NumberField
          label="Access from age"
          value={accessAge}
          onChange={(v) => onChange({ accessibleFromAge: v })}
          min={0}
          max={80}
          disabled={pot.accessAtRetirement}
        />
      </div>

      <FollowRetirementToggle
        label="Use my retirement age"
        checked={pot.accessAtRetirement}
        retirementAge={retirementAge}
        onChange={(v) => onChange({ accessAtRetirement: v })}
      />

      <div className="mt-3">
        <NumberField
          label="Stop contributing at age"
          value={endAge}
          onChange={(v) => onChange({ contributionEndAge: v })}
          min={0}
          max={NO_CONTRIBUTION_LIMIT}
          disabled={pot.contributionEndsAtRetirement}
          hint={
            contributionsCapped
              ? `Contributions stop at ${endAge}.`
              : `No age limit — set below ${NO_CONTRIBUTION_LIMIT} to add one.`
          }
        />
      </div>

      <FollowRetirementToggle
        label="Use my retirement age"
        checked={pot.contributionEndsAtRetirement}
        retirementAge={retirementAge}
        onChange={(v) => onChange({ contributionEndsAtRetirement: v })}
      />

      {(locked || bonus > 0 || contributionsCapped || drawdownPosition) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {drawdownPosition ? (
            <span
              className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              title="Position in your drawdown order"
            >
              Drawn #{drawdownPosition}
            </span>
          ) : null}
          {locked && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              🔒 Locked until {accessAge}
            </span>
          )}
          {contributionsCapped && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {contributionsEnded
                ? `Contributions ended at ${endAge}`
                : `Contribute until ${endAge}`}
            </span>
          )}
          {bonus > 0 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              +{formatCurrency(bonus)} bonus/yr
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="mt-2 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        {showAdvanced ? 'Hide' : 'Show'} government bonus settings
      </button>

      {showAdvanced && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <NumberField
            label="Gov. bonus %"
            value={pot.bonusRatePct}
            onChange={(v) => onChange({ bonusRatePct: v })}
            suffix="%"
            max={100}
          />
          <NumberField
            label="Bonus applies up to"
            value={pot.bonusCapAnnual}
            onChange={(v) => onChange({ bonusCapAnnual: v })}
            prefix="£"
            step={500}
          />
        </div>
      )}
    </div>
  )
}

interface FollowRetirementToggleProps {
  label: string
  checked: boolean
  retirementAge: number
  onChange: (checked: boolean) => void
}

/** Ties a pot's access or contribution-end age to the retirement age. */
function FollowRetirementToggle({
  label,
  checked,
  retirementAge,
  onChange,
}: FollowRetirementToggleProps) {
  return (
    <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600 dark:border-slate-600"
      />
      <span>
        {label} <span className="text-slate-400">({retirementAge})</span>
      </span>
    </label>
  )
}
