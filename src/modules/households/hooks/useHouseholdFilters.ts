import { useSearchParams } from 'react-router-dom'
import type {
  HouseholdFilters,
  HouseholdPageSize,
  HouseholdSortField,
  HouseholdStatus,
} from '../types'

const SORT_FIELDS: HouseholdSortField[] = [
  'createdAt',
  'name',
  'adminName',
  'adminEmail',
  'memberCount',
]

const STATUSES: HouseholdStatus[] = ['ACTIVE', 'DELETION_PENDING']

export const PAGE_SIZES: HouseholdPageSize[] = [25, 50, 100]

const DEFAULT_SORT_BY: HouseholdSortField = 'createdAt'
const DEFAULT_SORT_ORDER = 'DESC' as const
/** Matches the API's own default, so the first request looks the same as it
 *  always did and a bookmarked URL without `?limit=` behaves unchanged. */
const DEFAULT_LIMIT: HouseholdPageSize = 50

function parseSortField(value: string | undefined): HouseholdSortField {
  return SORT_FIELDS.includes(value as HouseholdSortField)
    ? (value as HouseholdSortField)
    : DEFAULT_SORT_BY
}

function parseStatus(value: string | null): HouseholdStatus | null {
  return STATUSES.includes(value as HouseholdStatus) ? (value as HouseholdStatus) : null
}

function parseLimit(value: string | null): HouseholdPageSize {
  const parsed = Number(value)
  return PAGE_SIZES.includes(parsed as HouseholdPageSize)
    ? (parsed as HouseholdPageSize)
    : DEFAULT_LIMIT
}

function parsePage(value: string | null): number {
  const parsed = Number(value ?? '1')
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
}

export function useHouseholdFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Stored in the URL as 'field:order' so a sorted view is bookmarkable. The
  // field stays in domain casing; `toListQuery` translates it for the API.
  const sortParam =
    searchParams.get('sort') ?? `${DEFAULT_SORT_BY}:${DEFAULT_SORT_ORDER.toLowerCase()}`
  const [sortByRaw, sortOrderRaw] = sortParam.split(':')

  const filters: HouseholdFilters = {
    page: parsePage(searchParams.get('page')),
    search: searchParams.get('search') ?? '',
    // An unrecognised ?sort= falls back rather than reaching the API as an
    // invalid sort_by and earning a 400. Same for ?status= and ?limit=.
    sortBy: parseSortField(sortByRaw),
    sortOrder: sortOrderRaw?.toUpperCase() === 'ASC' ? 'ASC' : DEFAULT_SORT_ORDER,
    limit: parseLimit(searchParams.get('limit')),
    status: parseStatus(searchParams.get('status')),
  }

  /**
   * Every writer goes through here. `resetPage` is the default because changing
   * what is being looked for while staying on page 4 of the old result set is
   * never what the operator meant.
   */
  const update = (
    mutate: (params: URLSearchParams) => void,
    { resetPage = true, replace = true }: { resetPage?: boolean; replace?: boolean } = {},
  ) => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        mutate(next)
        if (resetPage) next.delete('page')
        return next
      },
      // Filter changes replace rather than push: Back should leave the register,
      // not walk back through every keystroke of a search. Paging is the
      // exception — it pushes, because Back from page 3 means page 2.
      { replace },
    )
  }

  const setSearch = (search: string) =>
    update((next) => {
      if (search) next.set('search', search)
      else next.delete('search')
    })

  const setStatus = (status: HouseholdStatus | null) =>
    update((next) => {
      if (status) next.set('status', status)
      else next.delete('status')
    })

  const setLimit = (limit: HouseholdPageSize) =>
    update((next) => {
      if (limit === DEFAULT_LIMIT) next.delete('limit')
      else next.set('limit', String(limit))
    })

  const setSort = (sortBy: HouseholdSortField, sortOrder: 'ASC' | 'DESC' = 'DESC') =>
    update((next) => {
      next.set('sort', `${sortBy}:${sortOrder.toLowerCase()}`)
    })

  /**
   * Clicking a column sorts it; clicking the same column again reverses it.
   * A new column starts descending for dates and counts — most recent and
   * largest first is what a register is scanned for — and ascending for names,
   * where A–Z is the useful direction.
   */
  const toggleSort = (field: HouseholdSortField) => {
    if (filters.sortBy !== field) {
      const startsAscending = field === 'name' || field === 'adminName' || field === 'adminEmail'
      setSort(field, startsAscending ? 'ASC' : 'DESC')
      return
    }
    setSort(field, filters.sortOrder === 'ASC' ? 'DESC' : 'ASC')
  }

  const setPage = (page: number) =>
    update(
      (next) => {
        if (page <= 1) next.delete('page')
        else next.set('page', String(page))
      },
      { resetPage: false, replace: false },
    )

  const clearFilters = () =>
    update((next) => {
      next.delete('search')
      next.delete('status')
    })

  const hasFilters = Boolean(filters.search || filters.status)

  return {
    filters,
    hasFilters,
    setSearch,
    setStatus,
    setLimit,
    setSort,
    toggleSort,
    setPage,
    clearFilters,
  }
}
