import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useRestoreHousehold } from '../api/useRestoreHousehold'

interface RestoreHouseholdButtonProps {
  householdId: string
  onSuccess: () => void
}

export function RestoreHouseholdButton({ householdId, onSuccess }: RestoreHouseholdButtonProps) {
  const { mutate, isPending, error } = useRestoreHousehold()

  const handleRestore = () => {
    mutate(householdId, {
      onSuccess,
    })
  }

  return (
    <>
      <button onClick={handleRestore} disabled={isPending} style={{ color: 'green' }}>
        {isPending ? 'Restoring...' : 'Restore'}
      </button>
      {error && <div role="alert" style={{ color: 'red' }}>{getErrorMessage(error)}</div>}
    </>
  )
}
