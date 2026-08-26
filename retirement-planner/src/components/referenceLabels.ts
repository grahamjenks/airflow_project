/**
 * Reference-line labels collide when two events land in nearby years — with a
 * partner, "Me retires" and "Partner retires" render straight through each
 * other. Assign each label a row so close neighbours stack instead of overlap.
 *
 * The gap is measured in years rather than pixels because that is what the
 * caller knows; at the widths these charts render, labels stay clear of each
 * other from about six years apart.
 */
export const LABEL_GAP_YEARS = 7

/** Pixels between stacked label rows, a little over one line of 11px text. */
export const LABEL_ROW_HEIGHT = 13

/**
 * Row index per item, in the caller's original order. Items are packed
 * earliest-first into the topmost row that is still clear.
 */
export function labelRows(positions: number[], gap = LABEL_GAP_YEARS): number[] {
  const rows = new Array<number>(positions.length).fill(0)
  const lastInRow: number[] = []
  const byPosition = positions
    .map((position, index) => ({ position, index }))
    .sort((x, y) => x.position - y.position)

  for (const { position, index } of byPosition) {
    let row = 0
    while (row < lastInRow.length && position - lastInRow[row] < gap) row++
    lastInRow[row] = position
    rows[index] = row
  }
  return rows
}
