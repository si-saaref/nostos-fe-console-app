/** A deletion is reversible for thirty days. See PRODUCT.md. */
export const GRACE_PERIOD_DAYS = 30

const MS_PER_DAY = 86_400_000

export interface GracePeriod {
  daysRemaining: number
  /** How much of the thirty days is still to run, 0–1, for drawing to scale. */
  fraction: number
  lapsed: boolean
}

/**
 * The remaining grace on a deletion-pending household. Returns null when there
 * is no scheduled date to measure against — the register then endorses nothing
 * rather than guessing at a duration.
 */
export function graceRemaining(
  scheduledDeletionDate: string | null | undefined,
  now: number = Date.now(),
): GracePeriod | null {
  if (!scheduledDeletionDate) return null

  const scheduled = new Date(scheduledDeletionDate).getTime()
  if (Number.isNaN(scheduled)) return null

  const daysRemaining = Math.max(0, Math.ceil((scheduled - now) / MS_PER_DAY))

  return {
    daysRemaining,
    fraction: Math.max(0, Math.min(1, daysRemaining / GRACE_PERIOD_DAYS)),
    lapsed: daysRemaining === 0,
  }
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/**
 * Dates on a register are never ambiguous: "15 Jul 2026", not 07/15 or 15/07,
 * because an operator reading someone else's entry cannot ask which it meant.
 */
export function formatEntryDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateFormat.format(date)
}
