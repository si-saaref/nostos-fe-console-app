import { Link } from 'react-router-dom'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { PageHeader } from '@/components/PageHeader'
import { InfoCircleMark, PlusMark } from '@/components/icons'
import { useMetrics } from '../api/useMetrics'
import { MetricsGrid } from '../components/MetricsGrid'
import type { DashboardMetrics } from '../types'
import './dashboard.css'

/**
 * Shown only while `GET /console/dashboard/metrics` is unavailable — it is not
 * implemented on the service yet. Clearly labelled as sample figures wherever
 * it renders, so nobody reads it as the real state of the register.
 */
const SAMPLE_METRICS: DashboardMetrics = {
  households: 214,
  members: 1187,
  newThisWeek: 9,
  pendingDeletion: 4,
  active7d: 963,
  failedSignins: 3,
  failedEmails: 0,
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

export function ConsoleDashboardPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useMetrics()

  const isSample = !isLoading && (isError || !data)
  const metrics = data ?? SAMPLE_METRICS

  const description = isLoading
    ? 'Loading metrics…'
    : isSample
      ? 'Sample figures — the metrics service is not connected yet'
      : `Updated ${timeFormat.format(new Date(dataUpdatedAt))} · refreshes every 5 minutes`

  return (
    <ConsoleLayout>
      <PageHeader title="Dashboard" description={description}>
        <Link to="/console/households/new" role="button">
          <PlusMark />
          New household
        </Link>
      </PageHeader>

      {isSample && (
        <div className="notice notice--info" role="status">
          <span className="notice-icon">
            <InfoCircleMark />
          </span>
          <p>
            <strong>These are sample figures.</strong> The console could not reach the metrics
            service, so the numbers below are placeholders and do not reflect real households.
          </p>
        </div>
      )}

      <MetricsGrid metrics={metrics} />

      <div className="dashboard-cards">
        <section className="card">
          <div className="card-header">
            <h2>Awaiting action</h2>
          </div>
          <div className="card-body">
            {metrics.pendingDeletion > 0 ? (
              <p>
                <strong>{metrics.pendingDeletion}</strong>{' '}
                {metrics.pendingDeletion === 1 ? 'household is' : 'households are'} pending
                deletion. Each one can be restored until its grace period ends.
              </p>
            ) : (
              <p>Nothing is pending deletion right now.</p>
            )}
            <Link to="/console/households" className="card-action">
              Review in Households
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Common tasks</h2>
          </div>
          <div className="card-body">
            <ul className="task-list">
              <li>
                <Link to="/console/households/new">Register a new household</Link>
                <span>Creates the household and emails its admin an invite.</span>
              </li>
              <li>
                <Link to="/console/households">Find a household</Link>
                <span>Search by household name or admin email.</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </ConsoleLayout>
  )
}
