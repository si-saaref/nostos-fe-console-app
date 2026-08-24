import { cn } from '@/utils/cn'
import type { DashboardMetrics } from '../types'

const METRICS: Array<{ key: keyof DashboardMetrics; label: string; hint?: string }> = [
  { key: 'households', label: 'Households' },
  { key: 'members', label: 'Members' },
  { key: 'newThisWeek', label: 'New this week' },
  { key: 'pendingDeletion', label: 'Deletion pending' },
  { key: 'active7d', label: 'Active (7d)', hint: 'Members seen in the last 7 days' },
  { key: 'failedSignins', label: 'Failed signins (24h)' },
  { key: 'failedEmails', label: 'Failed emails' },
]

/**
 * Twelve columns so seven cards fill two rows exactly — four across, then three
 * across — instead of leaving a hole where an eighth card would go.
 *
 * The 1100px step is not a system breakpoint; it is where four of these cards
 * stop fitting. It was in the stylesheet this replaced and is preserved as-is,
 * because migrating this surface to Tailwind was not licence to redesign it.
 */
export function MetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <dl className="mb-6 grid grid-cols-12 gap-4">
      {METRICS.map(({ key, label, hint }, index) => (
        <div
          key={key}
          className={cn(
            'flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 shadow-rest',
            'col-span-12 min-[768px]:col-span-6',
            index < 4 ? 'min-[1100px]:col-span-3' : 'min-[1100px]:col-span-4',
          )}
        >
          <dt className="text-sm font-medium text-ink-2">{label}</dt>
          <dd className="text-3xl leading-[1.1] font-semibold tracking-[-0.02em] text-ink tabular-nums">
            {metrics[key]}
          </dd>
          {hint && <p className="text-xs text-ink-3">{hint}</p>}
        </div>
      ))}
    </dl>
  )
}
