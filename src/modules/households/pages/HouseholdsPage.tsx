import { Link, useNavigate } from 'react-router-dom'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { PageHeader } from '@/components/PageHeader'
import { SearchBar } from '@/components/SearchBar'
import { Pagination } from '@/components/Pagination'
import { PlusMark } from '@/components/icons'
import { useHouseholdFilters } from '../hooks/useHouseholdFilters'
import { useHouseholds } from '../api/useHouseholds'
import { HouseholdTable } from '../components/HouseholdTable'
import './households.css'

export function HouseholdsPage() {
  const navigate = useNavigate()
  const { filters, setSearch, setPage } = useHouseholdFilters()
  const { data, isLoading } = useHouseholds(filters)

  const total = data?.pagination.total
  const count =
    total !== undefined ? `${total} ${total === 1 ? 'household' : 'households'}` : undefined

  return (
    <ConsoleLayout>
      <PageHeader title="Households" description={count}>
        <Link to="/console/households/new" role="button">
          <PlusMark />
          New household
        </Link>
      </PageHeader>

      <section className="card">
        <div className="card-header">
          <SearchBar
            id="household-search"
            label="Search households"
            value={filters.search}
            onChange={setSearch}
            placeholder="Search by name or email..."
          />
        </div>

        <HouseholdTable
          households={data?.households ?? []}
          isLoading={isLoading}
          search={filters.search}
          onRowClick={(id) => navigate(`/console/households/${id}`)}
        />

        {data && data.pagination.totalPages > 1 && (
          <div className="card-footer">
            <span className="pagination-range">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPreviousPage={() => setPage(Math.max(1, filters.page - 1))}
              onNextPage={() => setPage(filters.page + 1)}
            />
          </div>
        )}
      </section>
    </ConsoleLayout>
  )
}
