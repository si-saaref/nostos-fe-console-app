import type { HouseholdDetail } from '../types'

export function HouseholdInfo({ household }: { household: HouseholdDetail }) {
  return (
    <section>
      <h1>{household.name}</h1>
      <p>Status: {household.status === 'ACTIVE' ? 'Active' : 'Deletion Pending'}</p>
      <p>Created: {new Date(household.createdAt).toLocaleDateString()}</p>
      {household.status === 'DELETION_PENDING' && household.scheduledDeletionDate && (
        <p>Will be deleted on {new Date(household.scheduledDeletionDate).toLocaleDateString()}</p>
      )}
    </section>
  )
}
