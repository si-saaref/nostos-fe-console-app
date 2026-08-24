import { Badge, type BadgeTone } from '@/components/Badge'
import { ResendInviteButton } from './ResendInviteButton'
import { Fact, Facts, Section } from './Facts'
import type { AdminClaimStatus, HouseholdAdmin } from '../types'

const CLAIM_STATUS: Record<AdminClaimStatus, { label: string; tone: BadgeTone }> = {
  CLAIMED: { label: 'Claimed', tone: 'neutral' },
  PENDING_INVITE: { label: 'Invite pending', tone: 'info' },
  INVITE_EXPIRED: { label: 'Invite expired', tone: 'warning' },
  DELETED: { label: 'Admin removed', tone: 'danger' },
  NO_INVITE: { label: 'No invite issued', tone: 'warning' },
}

/** A fresh link is only worth offering while the invite is still the blocker. */
const RESENDABLE: AdminClaimStatus[] = ['PENDING_INVITE', 'INVITE_EXPIRED', 'NO_INVITE']

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatMoment(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date)
}

interface AdminSectionProps {
  admin: HouseholdAdmin | null
  householdId: string
}

export function AdminSection({ admin, householdId }: AdminSectionProps) {
  if (!admin) {
    return (
      <Section title="Admin">
        <p className="text-md text-ink-2">
          No admin. This household has no ADMIN member, so there is nobody to invite or re-invite.
        </p>
      </Section>
    )
  }

  const claim = CLAIM_STATUS[admin.claimStatus]
  const canResend = RESENDABLE.includes(admin.claimStatus)

  return (
    <Section
      title="Admin"
      action={
        canResend && <ResendInviteButton householdId={householdId} adminEmail={admin.email} />
      }
    >
      <Facts>
        <Fact label="Name">{admin.name}</Fact>
        <Fact label="Email">{admin.email}</Fact>
        <Fact label="Claim status">
          <Badge tone={claim.tone}>{claim.label}</Badge>
        </Fact>
        {admin.claimStatus === 'PENDING_INVITE' && admin.inviteExpiresAt && (
          <Fact label="Invite expires">{formatMoment(admin.inviteExpiresAt)}</Fact>
        )}
        {admin.claimStatus === 'INVITE_EXPIRED' && admin.inviteExpiresAt && (
          <Fact label="Invite expired" tone="warning">
            {formatMoment(admin.inviteExpiresAt)}
          </Fact>
        )}
        {/* "Claimed on", not "Claimed": the badge above already says *whether*
            it is claimed, and two things labelled the same in one section is
            how an operator misreads a date as a status. */}
        {admin.claimedAt && <Fact label="Claimed on">{formatMoment(admin.claimedAt)}</Fact>}
        <Fact label="Last login">
          {admin.lastLoginAt ? formatMoment(admin.lastLoginAt) : 'Never signed in'}
        </Fact>
      </Facts>
    </Section>
  )
}
