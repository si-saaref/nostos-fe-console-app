import { DeleteHouseholdButton } from './DeleteHouseholdButton'
import { RestoreHouseholdButton } from './RestoreHouseholdButton'
import type { HouseholdDetail } from '../types'

interface HouseholdInfoProps {
  household: HouseholdDetail
  onRefresh?: () => void
}

export function HouseholdInfo({ household, onRefresh }: HouseholdInfoProps) {
  return (
    <section>
      <h1>{household.name}</h1>
      <p>Status: {household.status === 'ACTIVE' ? 'Active' : 'Deletion Pending'}</p>
      <p>Created: {new Date(household.createdAt).toLocaleDateString()}</p>
      {household.status === 'DELETION_PENDING' && household.scheduledDeletionDate && (
        <p>Will be deleted on {new Date(household.scheduledDeletionDate).toLocaleDateString()}</p>
      )}
      <div>
        {household.status === 'ACTIVE' && (
          <DeleteHouseholdButton
            householdId={household.id}
            householdName={household.name}
            onSuccess={() => onRefresh?.()}
          />
        )}
        {household.status === 'DELETION_PENDING' && (
          <RestoreHouseholdButton householdId={household.id} onSuccess={() => onRefresh?.()} />
        )}
      </div>
    </section>
  )
}
