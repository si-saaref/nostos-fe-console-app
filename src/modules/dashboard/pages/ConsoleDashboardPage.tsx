import { Link } from 'react-router-dom'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Notice } from '@/components/Notice'
import { buttonClasses } from '@/components/buttonStyles'
import { PlusMark } from '@/components/icons'
import { useMetrics } from '../api/useMetrics'
import { MetricsGrid } from '../components/MetricsGrid'
import type { DashboardMetrics } from '../types'

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
        <Link to="/console/households/new" className={buttonClasses('primary')}>
          <PlusMark />
          New household
        </Link>
      </PageHeader>

      {isSample && (
        <Notice tone="info" className="mb-6">
          <strong className="font-medium">These are sample figures.</strong> The console could not
          reach the metrics service, so the numbers below are placeholders and do not reflect real
          households.
        </Notice>
      )}

      <MetricsGrid metrics={metrics} />

      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <h2>Awaiting action</h2>
          </CardHeader>
          <CardBody className="grow">
            {metrics.pendingDeletion > 0 ? (
              <p className="text-md text-ink">
                <strong className="font-semibold tabular-nums">{metrics.pendingDeletion}</strong>{' '}
                {metrics.pendingDeletion === 1 ? 'household is' : 'households are'} pending
                deletion. Each one can be restored until its grace period ends.
              </p>
            ) : (
              <p className="text-md text-ink">Nothing is pending deletion right now.</p>
            )}
            <Link
              to="/console/households?status=DELETION_PENDING"
              className="mt-4 inline-block text-md font-medium text-navy"
            >
              Review in Households
            </Link>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <h2>Common tasks</h2>
          </CardHeader>
          <CardBody className="grow">
            <ul>
              <li className="border-b border-line pb-3">
                <Link
                  to="/console/households/new"
                  className="block font-medium text-navy no-underline hover:underline hover:underline-offset-2"
                >
                  Register a new household
                </Link>
                <span className="mt-0.5 block text-sm text-ink-2">
                  Creates the household and emails its admin an invite.
                </span>
              </li>
              <li className="pt-3">
                <Link
                  to="/console/households"
                  className="block font-medium text-navy no-underline hover:underline hover:underline-offset-2"
                >
                  Find a household
                </Link>
                <span className="mt-0.5 block text-sm text-ink-2">
                  Search by household name or admin email.
                </span>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </ConsoleLayout>
  )
}
