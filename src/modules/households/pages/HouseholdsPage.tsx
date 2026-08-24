import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { PageHeader } from '@/components/PageHeader'
import { SearchBar } from '@/components/SearchBar'
import { Pagination } from '@/components/Pagination'
import { Select } from '@/components/Field'
import { buttonClasses } from '@/components/buttonStyles'
import { Card, CardFooter } from '@/components/Card'
import { PlusMark } from '@/components/icons'
import { PAGE_SIZES, useHouseholdFilters } from '../hooks/useHouseholdFilters'
import { useHouseholds } from '../api/useHouseholds'
import { HouseholdTable } from '../components/HouseholdTable'
import type { HouseholdPageSize, HouseholdStatus } from '../types'

export function HouseholdsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    filters,
    hasFilters,
    setSearch,
    setStatus,
    setLimit,
    toggleSort,
    setPage,
    clearFilters,
  } = useHouseholdFilters()
  const { data, isLoading } = useHouseholds(filters)

  const pagination = data?.pagination
  const total = pagination?.total

  // The dialog routes are nested under this one, so the list stays mounted
  // behind them and the search params they were opened with are still in the
  // URL. Opening a household never costs the operator their place.
  const openHousehold = (id: string) =>
    navigate({ pathname: `/console/households/${id}`, search: location.search })

  const description =
    total !== undefined ? `${total} ${total === 1 ? 'household' : 'households'}` : undefined

  const rangeStart = pagination && total ? (pagination.page - 1) * pagination.limit + 1 : 0
  const rangeEnd =
    pagination && total ? Math.min(pagination.page * pagination.limit, total) : 0

  return (
    <ConsoleLayout>
      <PageHeader title="Households" description={description}>
        <Link
          to={{ pathname: '/console/households/new', search: location.search }}
          className={buttonClasses('primary')}
        >
          <PlusMark />
          New household
        </Link>
      </PageHeader>

      <Card>
        {/* The rows scroll inside the card, so this stays in view without
            needing to be sticky — see SCROLL_AREA in HouseholdTable. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 md:flex-nowrap md:px-5">
          <SearchBar
            id="household-search"
            label="Search households"
            value={filters.search}
            onChange={setSearch}
            placeholder="Search by name or admin email…"
            className="w-full min-w-0 md:max-w-[360px]"
          />

          <label htmlFor="household-status" className="vh">
            Filter by status
          </label>
          <Select
            id="household-status"
            value={filters.status ?? ''}
            onChange={(event) => setStatus((event.target.value || null) as HouseholdStatus | null)}
            className="min-w-[150px]"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DELETION_PENDING">Deletion pending</option>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="household-limit" className="text-sm whitespace-nowrap text-ink-2">
              Per page
            </label>
            <Select
              id="household-limit"
              value={filters.limit}
              onChange={(event) => setLimit(Number(event.target.value) as HouseholdPageSize)}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <HouseholdTable
          households={data?.households ?? []}
          isLoading={isLoading}
          search={filters.search}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={toggleSort}
          onRowClick={openHousehold}
        />

        {pagination && total ? (
          <CardFooter>
            <span className="text-sm text-ink-2 tabular-nums">
              Showing {rangeStart}–{rangeEnd} of {total}
            </span>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </CardFooter>
        ) : null}
      </Card>

      {/* /console/households/new and /:id render here, over the register. */}
      <Outlet />
    </ConsoleLayout>
  )
}
