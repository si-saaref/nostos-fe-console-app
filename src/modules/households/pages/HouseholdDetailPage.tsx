import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useHousehold } from '../api/useHousehold'
import { HouseholdInfo } from '../components/HouseholdInfo'
import { AdminSection } from '../components/AdminSection'
import { MembersList } from '../components/MembersList'
import { DeleteHouseholdButton } from '../components/DeleteHouseholdButton'
import { RestoreHouseholdButton } from '../components/RestoreHouseholdButton'

/**
 * The household detail, as an overlay on the register rather than a page of its
 * own. An operator resolving a ticket opens a row, acts, and closes it — they
 * never lose their scroll position, their search, or their page.
 *
 * Rendered by the nested `/households/:id` route, so the URL is still
 * the address of one household and a link out of a ticket still works.
 */
export function HouseholdDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: detail, isPending, isError, error } = useHousehold(id)

  // Closing returns to the register carrying the filters it was opened from.
  const close = () => navigate({ pathname: '/households', search: location.search })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
  }

  const title = detail?.household.name ?? 'Household'
  const isPendingDeletion = detail?.household.status === 'DELETION_PENDING'

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={title}
      size="lg"
      /* The admin's address, because that is what the ticket names and what
         confirms the operator opened the right row. With no admin there is no
         address to show, and the Admin section already says so — repeating it
         under the title would just be the same sentence twice. */
      description={detail?.admin?.email}
      titleAside={
        detail && (
          <Badge tone={isPendingDeletion ? 'warning' : 'neutral'}>
            {isPendingDeletion ? 'Deletion Pending' : 'Active'}
          </Badge>
        )
      }
      footer={
        detail && (
          /* The destructive action sits at the far end from Close, so the two
             are never adjacent targets. */
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {isPendingDeletion ? (
              <RestoreHouseholdButton
                householdId={detail.household.id}
                householdName={detail.household.name}
                onSuccess={refresh}
              />
            ) : (
              <DeleteHouseholdButton
                householdId={detail.household.id}
                householdName={detail.household.name}
                onSuccess={refresh}
              />
            )}
            <Button onClick={close}>Close</Button>
          </div>
        )
      }
    >
      {/* isPending, not `isLoading || !data`: a 404 leaves data undefined
          forever, and the old guard rendered a loading state that never
          resolved. */}
      {isPending ? (
        <p role="status">Loading household…</p>
      ) : isError || !detail ? (
        <p role="alert">{getErrorMessage(error)}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <HouseholdInfo household={detail.household} />
          <AdminSection admin={detail.admin} householdId={detail.household.id} />
          <MembersList members={detail.members} />
        </div>
      )}
    </Dialog>
  )
}
