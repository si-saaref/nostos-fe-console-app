import { Badge } from '@/components/Badge'
import { formatEntryDate, graceRemaining } from '../grace'
import type { HouseholdSummary } from '../types'

export interface HouseholdTableProps {
  households: HouseholdSummary[]
  isLoading: boolean
  onRowClick: (id: string) => void
  search?: string
}

function LoadingRows() {
  return (
    <div className="table-loading">
      <p role="status">Loading households…</p>
    </div>
  )
}

export function HouseholdTable({
  households,
  isLoading,
  onRowClick,
  search,
}: HouseholdTableProps) {
  if (isLoading) return <LoadingRows />

  if (households.length === 0) {
    return (
      <div className="empty-state">
        {search ? (
          <p>No households match “{search}”. Check the spelling, or search by admin email.</p>
        ) : (
          <p>No households yet. Create one to get started.</p>
        )}
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="households-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Admin</th>
            <th scope="col" className="col-num">
              Members
            </th>
            <th scope="col">Created</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {households.map((household) => {
            const isPending = household.status === 'DELETION_PENDING'
            const grace = isPending ? graceRemaining(household.deletionScheduledFor) : null

            return (
              <tr key={household.id} onClick={() => onRowClick(household.id)}>
                <td>
                  <button
                    type="button"
                    className="cell-link"
                    onClick={(event) => {
                      event.stopPropagation()
                      onRowClick(household.id)
                    }}
                  >
                    {household.name}
                  </button>
                </td>

                <td title={household.adminEmail ?? undefined}>
                  {household.adminName || household.adminEmail ? (
                    <>
                      <span className="cell-primary">{household.adminName ?? '—'}</span>
                      <span className="cell-secondary">{household.adminEmail ?? '—'}</span>
                    </>
                  ) : (
                    <span className="cell-secondary">No admin</span>
                  )}
                </td>

                <td className="col-num">{household.memberCount}</td>

                <td className="cell-muted">{formatEntryDate(household.createdAt)}</td>

                <td className="cell-status">
                  {isPending ? (
                    <>
                      <Badge tone="warning">Deletion Pending</Badge>
                      {household.deletionScheduledFor && (
                        <span className="cell-secondary">
                          {grace?.lapsed
                            ? 'Grace period ended'
                            : `Deletes ${formatEntryDate(household.deletionScheduledFor)}`}
                        </span>
                      )}
                    </>
                  ) : (
                    <Badge tone="neutral">Active</Badge>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
