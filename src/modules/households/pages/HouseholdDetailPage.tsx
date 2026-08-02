import { useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { useHousehold } from '../api/useHousehold'
import { HouseholdInfo } from '../components/HouseholdInfo'
import { AdminSection } from '../components/AdminSection'
import { MembersList } from '../components/MembersList'

export function HouseholdDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: household, isLoading } = useHousehold(id)

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
      <HouseholdInfo household={household} />
      <AdminSection admin={household.admin} />
      <MembersList members={household.members} />
    </main>
  )
}
