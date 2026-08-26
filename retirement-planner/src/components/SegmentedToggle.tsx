/**
 * A two-option segmented control. Replaces buttons that showed the state you
 * would switch *to* — which reads as a label, not an action, and left you
 * guessing which mode you were actually in.
 */
export function SegmentedToggle<T extends string | boolean>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: readonly (readonly [T, string, string?])[]
  onChange: (value: T) => void
  ariaLabel?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600"
    >
      {options.map(([optionValue, label, title]) => (
        <button
          key={String(optionValue)}
          type="button"
          onClick={() => onChange(optionValue)}
          aria-pressed={value === optionValue}
          title={title}
          className={`px-2.5 py-1 text-xs font-medium ${
            value === optionValue
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
