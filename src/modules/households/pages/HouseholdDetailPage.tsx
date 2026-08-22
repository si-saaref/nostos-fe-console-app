import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Breadcrumb } from '@/components/Breadcrumb'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useHousehold } from '../api/useHousehold'
import { HouseholdInfo } from '../components/HouseholdInfo'
import { AdminSection } from '../components/AdminSection'
import { MembersList } from '../components/MembersList'

export function HouseholdDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: detail, isPending, isError, error } = useHousehold(id)

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['console', 'households', id] })
  }

  // isPending, not `isLoading || !data`: a 404 leaves data undefined forever,
  // and the old guard rendered a loading state that never resolved.
  if (isPending) {
    return <p role="status">Loading household…</p>
  }

  if (isError || !detail) {
    return (
      <main>
        <Breadcrumb
          items={[
            { label: 'Console', to: '/console' },
            { label: 'Households', to: '/console/households' },
          ]}
        />
        <p role="alert">{getErrorMessage(error)}</p>
      </main>
    )
  }

  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Console', to: '/console' },
          { label: 'Households', to: '/console/households' },
          { label: detail.household.name },
        ]}
      />
      <HouseholdInfo household={detail.household} onRefresh={handleRefresh} />
      <AdminSection admin={detail.admin} householdId={detail.household.id} />
      <MembersList members={detail.members} />
    </main>
  )
}
