import { Button } from '@/components/Button'
import { MailMark } from '@/components/icons'
import { useToast } from '@/components/toastContext'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useResendInvite } from '../api/useResendInvite'

interface ResendInviteButtonProps {
  householdId: string
  adminEmail: string
}

const expiryFormat = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export function ResendInviteButton({ householdId, adminEmail }: ResendInviteButtonProps) {
  const { mutate, isPending, error, data } = useResendInvite()
  const toast = useToast()

  // One resend per household per day is a backend rule with no client-side
  // counter, so the button stays enabled and the 429 — whose message names the
  // wait — is what tells the operator.
  const handleResend = () =>
    mutate(householdId, {
      onSuccess: (result) => {
        toast.success(
          `Invite resent to ${adminEmail}. The new link expires ${expiryFormat.format(
            new Date(result.newExpiry),
          )}.`,
        )
      },
    })

  return (
    <div className="flex flex-col items-end gap-2">
      <Button size="sm" onClick={handleResend} disabled={isPending} aria-busy={isPending}>
        <MailMark />
        {isPending ? 'Sending...' : 'Resend Invite'}
      </Button>

      {/* The toast is the echo; this is the record that survives it. */}
      {data && (
        <span role="status" className="text-right">
          New link expires {expiryFormat.format(new Date(data.newExpiry))}
        </span>
      )}
      {error && (
        <span role="alert" className="text-right">
          {getErrorMessage(error)}
        </span>
      )}
    </div>
  )
}
