import { Link } from 'react-router-dom'
import { useMetrics } from '../api/useMetrics'
import { MetricsGrid } from '../components/MetricsGrid'

export function ConsoleDashboardPage() {
  const { data: metrics, isLoading } = useMetrics()

  const hasMetrics = metrics && Object.keys(metrics).length > 0

  return (
    <main>
      <h1>Nostos Operator Console</h1>
      <nav>
        <Link to="/console/dashboard">Dashboard</Link>
        <Link to="/console/households">Households</Link>
      </nav>
      <Link to="/console/households/new" role="button">
        New Household
      </Link>
      {isLoading || !hasMetrics ? (
        <p role="status">Loading metrics…</p>
      ) : (
        <MetricsGrid metrics={metrics} />
      )}
    </main>
  )
}
