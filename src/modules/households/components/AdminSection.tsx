import { ResendInviteButton } from './ResendInviteButton'
import type { AdminClaimStatus, HouseholdAdmin } from '../types'

const CLAIM_STATUS_LABELS: Record<AdminClaimStatus, string> = {
  CLAIMED: 'Claimed',
  PENDING_INVITE: 'Invite pending',
  INVITE_EXPIRED: 'Invite expired',
  DELETED: 'Admin removed',
  NO_INVITE: 'No invite issued',
}

/** A fresh link is only worth offering while the invite is still the blocker. */
const RESENDABLE: AdminClaimStatus[] = ['PENDING_INVITE', 'INVITE_EXPIRED', 'NO_INVITE']

interface AdminSectionProps {
  admin: HouseholdAdmin | null
  householdId: string
}

export function AdminSection({ admin, householdId }: AdminSectionProps) {
  if (!admin) {
    return (
      <section aria-label="Admin">
        <h2>Admin</h2>
        <p>No admin. This household has no ADMIN member.</p>
      </section>
    )
  }

  return (
    <section aria-label="Admin">
      <h2>Admin</h2>
      <p>Name: {admin.name}</p>
      <p>Email: {admin.email}</p>
      <p>Status: {CLAIM_STATUS_LABELS[admin.claimStatus]}</p>
      {admin.claimStatus === 'PENDING_INVITE' && admin.inviteExpiresAt && (
        <p>Invite expires {new Date(admin.inviteExpiresAt).toLocaleString()}</p>
      )}
      {admin.lastLoginAt && <p>Last Login: {new Date(admin.lastLoginAt).toLocaleString()}</p>}
      {RESENDABLE.includes(admin.claimStatus) && (
        <ResendInviteButton householdId={householdId} adminEmail={admin.email} />
      )}
    </section>
  )
}
