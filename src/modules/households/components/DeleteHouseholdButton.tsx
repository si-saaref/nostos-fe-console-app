import { useState } from 'react'
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
      <button onClick={() => setIsOpen(true)} disabled={isPending} style={{ color: 'red' }}>
        Delete Household
      </button>

      {isOpen && (
        <div role="alertdialog">
          <h2>Delete {householdName}?</h2>
          <p>
            This household will be marked for deletion. It will be permanently deleted in 30 days.
            You can restore it during this period.
          </p>
          {error && <div role="alert" style={{ color: 'red' }}>{(error as Error).message}</div>}
          <div>
            <button onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </button>
            <button onClick={handleDelete} disabled={isPending} style={{ color: 'red' }}>
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
