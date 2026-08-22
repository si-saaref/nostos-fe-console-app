import { useState } from 'react'
import { getErrorMessage } from '@/utils/apiErrorMessages'
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
  const { mutate, isPending, error } = useDeleteHousehold()

  const handleDelete = () => {
    mutate(householdId, {
      onSuccess: () => {
        setIsOpen(false)
        onSuccess()
      },
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        style={{ color: 'red' }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        Delete Household
      </button>

      {isOpen && (
        <div
          role="alertdialog"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          aria-modal="true"
        >
          <h2 id="delete-dialog-title">Delete {householdName}?</h2>
          <p id="delete-dialog-description">
            This household will be marked for deletion. It will be permanently deleted in 30 days.
            You can restore it during this period.
          </p>
          {error && (
            <div role="alert" style={{ color: 'red' }} aria-live="polite">
              {getErrorMessage(error)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{ color: 'red' }}
              aria-busy={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
