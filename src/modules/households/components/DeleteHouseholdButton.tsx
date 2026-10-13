import { useState } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/Dialog'
import { TrashMark } from '@/components/icons'
import { useToast } from '@/components/toastContext'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { GRACE_PERIOD_DAYS } from '../grace'
import { useDeleteHousehold } from '../api/useDeleteHousehold'

interface DeleteHouseholdButtonProps {
  householdId: string
  householdName: string
  onSuccess: () => void
}

export function DeleteHouseholdButton({
  householdId,
  householdName,
  onSuccess,
}: DeleteHouseholdButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { mutate, isPending, error, reset } = useDeleteHousehold()
  const toast = useToast()

  const handleDelete = () => {
    mutate(householdId, {
      onSuccess: () => {
        setIsOpen(false)
        toast.success(`${householdName} is scheduled for deletion. You can restore it until then.`)
        onSuccess()
      },
    })
  }

  return (
    <>
      <Button
        variant="danger"
        onClick={() => {
          reset()
          setIsOpen(true)
        }}
        disabled={isPending}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <TrashMark />
        Delete Household
      </Button>

      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Delete ${householdName}?`}
        description={
          <>
            This household will be marked for deletion and permanently deleted in{' '}
            {GRACE_PERIOD_DAYS} days. You can restore it at any point during that period.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting..."
        tone="danger"
        busy={isPending}
        error={error && <div role="alert">{getErrorMessage(error)}</div>}
        onConfirm={handleDelete}
      />
    </>
  )
}
