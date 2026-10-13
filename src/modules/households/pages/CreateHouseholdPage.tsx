import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { useToast } from '@/components/toastContext'
import { CreateHouseholdForm } from '../components/CreateHouseholdForm'
import type { CreatedHousehold } from '../types'

const FORM_ID = 'create-household-form'

/**
 * Registering a household, as a modal over the register. Four fields and one
 * outcome — the errand does not deserve a page navigation, and an operator who
 * changes their mind should land back exactly where they were.
 */
export function CreateHouseholdPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [isPending, setIsPending] = useState(false)

  const close = () => navigate({ pathname: '/households', search: location.search })

  const handleSuccess = (created: CreatedHousehold) => {
    // The household exists either way; a null `inviteSentAt` means the claim
    // email failed to send, which the operator has to know to act on.
    if (created.inviteSentAt) {
      toast.success(`Household created. Invite sent to ${created.adminEmail}.`)
    } else {
      toast.error(
        `Household created, but the invite to ${created.adminEmail} could not be sent. Resend it from the household.`,
      )
    }

    // Straight into the new household's record, carrying the register's filters.
    navigate({ pathname: `/households/${created.householdId}`, search: location.search })
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Create Household"
      description="Creates the household and emails its admin a claim link."
      size="md"
      busy={isPending}
      footer={
        <>
          <Button onClick={close} disabled={isPending}>
            Cancel
          </Button>
          {/* Outside the form on purpose: it belongs in the footer, and the
              HTML `form` attribute is what submits a form from outside it. */}
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <CreateHouseholdForm
        formId={FORM_ID}
        onSuccess={handleSuccess}
        onPendingChange={setIsPending}
      />
    </Dialog>
  )
}
