import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Breadcrumb } from '@/components/Breadcrumb'
import { useHousehold } from '../api/useHousehold'
import { HouseholdInfo } from '../components/HouseholdInfo'
import { AdminSection } from '../components/AdminSection'
import { MembersList } from '../components/MembersList'

export function HouseholdDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: household, isLoading } = useHousehold(id)

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['console', 'household', id] })
  }

  if (isLoading || !household) {
    return <p role="status">Loading household…</p>
  }

  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Console', to: '/console/dashboard' },
          { label: 'Households', to: '/console/households' },
          { label: household.name },
        ]}
      />
      <HouseholdInfo household={household} onRefresh={handleRefresh} />
      <AdminSection admin={household.admin} />
      <MembersList members={household.members} />
    </main>
  )
}
