import type { DashboardMetrics } from '../types'

const METRIC_LABELS: Record<keyof DashboardMetrics, string> = {
  households: 'Households',
  members: 'Members',
  newThisWeek: 'New (week)',
  pendingDeletion: 'Pending',
  active7d: 'Active (7d)',
  failedSignins: 'Failed 24h',
  failedEmails: 'Email Errors',
}

export function MetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <dl className="metrics-grid">
      {(Object.keys(METRIC_LABELS) as Array<keyof DashboardMetrics>).map((key) => (
        <div key={key} className="metrics-grid__item">
          <dt>{METRIC_LABELS[key]}</dt>
          <dd>{metrics[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
