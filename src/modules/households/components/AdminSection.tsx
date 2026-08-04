import { ResendInviteButton } from './ResendInviteButton'
import type { HouseholdAdmin } from '../types'

interface AdminSectionProps {
  admin: HouseholdAdmin
  householdId: string
}

export function AdminSection({ admin, householdId }: AdminSectionProps) {
  return (
    <section aria-label="Admin">
      <h2>Admin</h2>
      <p>Name: {admin.name}</p>
      <p>Email: {admin.email}</p>
      <p>Status: {admin.claimStatus === 'CLAIMED' ? 'Claimed' : 'Pending Claim'}</p>
      {admin.lastLoginAt && <p>Last Login: {new Date(admin.lastLoginAt).toLocaleString()}</p>}
      {admin.claimStatus === 'PENDING_INVITE' && (
        <ResendInviteButton householdId={householdId} adminEmail={admin.email} />
      )}
    </section>
  )
}
