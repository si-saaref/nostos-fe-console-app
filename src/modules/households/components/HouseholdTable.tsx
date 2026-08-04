import { Badge } from '@/components/Badge'
import type { HouseholdSummary } from '../types'

export interface HouseholdTableProps {
  households: HouseholdSummary[]
  isLoading: boolean
  onRowClick: (id: string) => void
}

export function HouseholdTable({ households, isLoading, onRowClick }: HouseholdTableProps) {
  if (isLoading) {
    return <p role="status">Loading households…</p>
  }

  if (households.length === 0) {
    return <p>No households yet. Create one to get started.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Admin Name</th>
          <th>Created</th>
          <th>Members</th>
        </tr>
      </thead>
      <tbody>
        {households.map((household) => (
          <tr key={household.id} onClick={() => onRowClick(household.id)} style={{ cursor: 'pointer' }}>
            <td>
              {household.name}
              {household.status === 'DELETION_PENDING' && <Badge tone="warning">Deletion Pending</Badge>}
            </td>
            <td>{household.adminName}</td>
            <td>{new Date(household.createdAt).toLocaleDateString()}</td>
            <td>{household.memberCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
