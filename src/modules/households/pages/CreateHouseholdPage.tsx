import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Breadcrumb } from '@/components/Breadcrumb'
import { CreateHouseholdForm } from '../components/CreateHouseholdForm'

export function CreateHouseholdPage() {
  const navigate = useNavigate()

  const handleSuccess = (householdId: string) => {
    navigate(`/console/households/${householdId}`)
  }

  useEffect(() => {
    const meta = document.querySelector('meta[name="page-title"]')
    if (meta) meta.setAttribute('content', 'Create Household')
  }, [])

  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Console', to: '/console' },
          { label: 'Households', to: '/console/households' },
          { label: 'Create New' },
        ]}
      />
      <h1>Create Household</h1>
      <CreateHouseholdForm onSuccess={handleSuccess} />
    </main>
  )
}
