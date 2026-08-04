import { useResendInvite } from '../api/useResendInvite'

interface ResendInviteButtonProps {
  householdId: string
  adminEmail: string
}

export function ResendInviteButton({ householdId, adminEmail }: ResendInviteButtonProps) {
  const { mutate, isPending, error, isSuccess } = useResendInvite()

  const handleResend = () => {
    mutate(householdId)
  }

  return (
    <>
      <button onClick={handleResend} disabled={isPending}>
        {isPending ? 'Sending...' : 'Resend Invite'}
      </button>
      {error && <div role="alert" style={{ color: 'red' }}>{(error as Error).message}</div>}
      {isSuccess && (
        <div role="status" style={{ color: 'green' }}>
          Invite resent to {adminEmail}
        </div>
      )}
    </>
  )
}
