import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useResendInvite } from '../api/useResendInvite'

interface ResendInviteButtonProps {
  householdId: string
  adminEmail: string
}

export function ResendInviteButton({ householdId, adminEmail }: ResendInviteButtonProps) {
  const { mutate, isPending, error, data } = useResendInvite()

  // One resend per household per day is a backend rule with no client-side
  // counter, so the button stays enabled and the 429 — whose message names the
  // wait — is what tells the operator.
  return (
    <>
      <button onClick={() => mutate(householdId)} disabled={isPending}>
        {isPending ? 'Sending...' : 'Resend Invite'}
      </button>
      {error && (
        <div role="alert" style={{ color: 'red' }}>
          {getErrorMessage(error)}
        </div>
      )}
      {data && (
        <div role="status" style={{ color: 'green' }}>
          Invite resent to {adminEmail}. The new link expires{' '}
          {new Date(data.newExpiry).toLocaleString()}.
        </div>
      )}
    </>
  )
}
