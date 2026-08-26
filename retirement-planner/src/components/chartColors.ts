/**
 * Colours are allocated by role so nothing important can be mistaken for
 * something else:
 *
 *   red            → problems only (shortfall, outgoings)
 *   amber / violet → guaranteed income you cannot draw on early
 *   blue / indigo  → DC pension pots
 *   teal → green   → savings pots
 *   slate          → salary
 *
 * Savings pots deliberately avoid every red, pink and magenta hue so a pot
 * segment is never confused with a shortfall.
 */

/** DC pension pots, one per person. */
export const PENSION_COLORS = ['#2563eb', '#4f46e5']

/** Savings pots, cycled in order. Teal through green — never red or pink. */
export const POT_COLORS = [
  '#0d9488', // teal
  '#65a30d', // lime
  '#0891b2', // cyan
  '#15803d', // green
  '#0369a1', // deep blue
  '#059669', // emerald
  '#4d7c0f', // olive
  '#115e59', // dark teal
]

/** Guaranteed income sources. */
export const STATE_PENSION_COLOR = '#f59e0b'
export const DB_PENSION_COLOR = '#8b5cf6'
export const SALARY_COLOR = '#94a3b8'

/** Reserved for shortfalls and the outgoings line — nothing else. */
export const ALERT_COLOR = '#e11d48'
