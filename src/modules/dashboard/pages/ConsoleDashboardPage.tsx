import { Link } from 'react-router-dom'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/Card'
import { Notice } from '@/components/Notice'
import { buttonClasses } from '@/components/buttonStyles'
import { PlusMark } from '@/components/icons'

export function ConsoleDashboardPage() {
  return (
    <ConsoleLayout>
      <PageHeader title="Dashboard">
        <Link to="/households/new" className={buttonClasses('primary')}>
          <PlusMark />
          New household
        </Link>
      </PageHeader>

      <Notice tone="info" className="mb-6">
        <strong className="font-medium">Metrics are unavailable.</strong>{' '}
        You can still create, find, and manage households below.
      </Notice>

      <Card className="flex flex-col">
        <CardHeader>
          <h2>Common tasks</h2>
        </CardHeader>
        <CardBody className="grow">
          <ul>
            <li className="border-b border-line pb-3">
              <Link
                to="/households/new"
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
                to="/households"
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
    </ConsoleLayout>
  )
}
