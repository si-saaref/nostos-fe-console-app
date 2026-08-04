import { Link } from 'react-router-dom'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { useMetrics } from '../api/useMetrics'
import { MetricsGrid } from '../components/MetricsGrid'
import './dashboard.css'

export function ConsoleDashboardPage() {
  const { data: metrics, isLoading } = useMetrics()

  const hasMetrics = metrics && Object.keys(metrics).length > 0

  return (
    <ConsoleLayout>
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <Link to="/console/households/new" role="button" className="dashboard-new-household-btn">
          + New Household
        </Link>
      </div>

      {isLoading || !hasMetrics ? (
        <p role="status" style={{ textAlign: 'center', color: '#6b6375' }}>
          Loading metrics…
        </p>
      ) : (
        <MetricsGrid metrics={metrics} />
      )}
    </ConsoleLayout>
  )
}
