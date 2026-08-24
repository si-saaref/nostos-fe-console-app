import { useState } from 'react'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/Dialog'
import { UndoMark } from '@/components/icons'
import { useToast } from '@/components/toastContext'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useRestoreHousehold } from '../api/useRestoreHousehold'

interface RestoreHouseholdButtonProps {
  householdId: string
  householdName: string
  onSuccess: () => void
}

/**
 * Restore confirms too, even though it is the safe direction. The operator is
 * usually acting on someone else's ticket, and naming the household back to
 * them is how they catch having opened the wrong row.
 */
export function RestoreHouseholdButton({
  householdId,
  householdName,
  onSuccess,
}: RestoreHouseholdButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { mutate, isPending, error, reset } = useRestoreHousehold()
  const toast = useToast()

  const handleRestore = () => {
    mutate(householdId, {
      onSuccess: () => {
        setIsOpen(false)
        toast.success(`${householdName} has been restored.`)
        onSuccess()
      },
    })
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          reset()
          setIsOpen(true)
        }}
        disabled={isPending}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <UndoMark />
        Restore
      </Button>

      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Restore ${householdName}?`}
        description="The scheduled deletion is cancelled and the household becomes active again. Its members are unaffected."
        confirmLabel="Restore"
        busyLabel="Restoring..."
        busy={isPending}
        error={error && <div role="alert">{getErrorMessage(error)}</div>}
        onConfirm={handleRestore}
      />
    </>
  )
}
