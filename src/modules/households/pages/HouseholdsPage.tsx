import { useNavigate } from 'react-router-dom'
import { SearchBar } from '@/components/SearchBar'
import { Pagination } from '@/components/Pagination'
import { useHouseholdFilters } from '../hooks/useHouseholdFilters'
import { useHouseholds } from '../api/useHouseholds'
import { HouseholdTable } from '../components/HouseholdTable'

export function HouseholdsPage() {
  const navigate = useNavigate()
  const { filters, setSearch, setPage } = useHouseholdFilters()
  const { data, isLoading } = useHouseholds(filters)

  return (
    <main>
      <h1>Households</h1>
      <SearchBar value={filters.search} onChange={setSearch} placeholder="Search by name or email..." />
      <HouseholdTable
        households={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(id) => navigate(`/console/households/${id}`)}
      />
      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPreviousPage={() => setPage(Math.max(1, filters.page - 1))}
          onNextPage={() => setPage(filters.page + 1)}
        />
      )}
    </main>
  )
}
