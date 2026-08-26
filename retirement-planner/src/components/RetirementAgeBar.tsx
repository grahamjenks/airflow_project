import type { Person } from '../lib/types'

interface RetirementAgeBarProps {
  people: Person[]
  onChange: (people: Person[]) => void
}

const MAX_RETIREMENT_AGE = 85

/**
 * Retirement ages sit at the top because they are the one input people want to
 * push around while watching the summary, and reaching them meant opening the
 * sidebar and scrolling. Same values as the sidebar fields — this is a second
 * way in, not a second source of truth.
 */
export function RetirementAgeBar({ people, onChange }: RetirementAgeBarProps) {
  function setAge(id: string, age: number) {
    onChange(
      people.map((p) =>
        p.id === id
          ? { ...p, retirementAge: Math.min(MAX_RETIREMENT_AGE, Math.max(p.currentAge, age)) }
          : p,
      ),
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Retire at
        </span>
        {people.map((person) => {
          const atFloor = person.retirementAge <= person.currentAge
          const atCeiling = person.retirementAge >= MAX_RETIREMENT_AGE
          return (
            <div
              key={person.id}
              className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1"
            >
              <span className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-200">
                {person.name}
              </span>
              <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setAge(person.id, person.retirementAge - 1)}
                  disabled={atFloor}
                  aria-label={`${person.name} retires a year earlier`}
                  className="px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
                >
                  −
                </button>
                <span className="min-w-[2.5rem] px-1 text-center text-sm font-semibold tabular-nums">
                  {person.retirementAge}
                </span>
                <button
                  type="button"
                  onClick={() => setAge(person.id, person.retirementAge + 1)}
                  disabled={atCeiling}
                  aria-label={`${person.name} retires a year later`}
                  className="px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min={person.currentAge}
                max={MAX_RETIREMENT_AGE}
                step={1}
                value={person.retirementAge}
                onChange={(e) => setAge(person.id, Number(e.target.value))}
                aria-label={`${person.name}'s retirement age`}
                className="min-w-0 flex-1"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
