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

export function MetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <dl className="metrics">
      {METRICS.map(({ key, label, hint }) => (
        <div className="metric card" key={key}>
          <dt>{label}</dt>
          <dd>{metrics[key]}</dd>
          {hint && <p className="metric-hint">{hint}</p>}
        </div>
      ))}
    </dl>
  )
}
