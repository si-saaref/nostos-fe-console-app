import { useSearchParams } from 'react-router-dom'
import type { HouseholdFilters, HouseholdSortField } from '../types'

const SORT_FIELDS: HouseholdSortField[] = [
  'createdAt',
  'name',
  'adminName',
  'adminEmail',
  'memberCount',
]

const DEFAULT_SORT_BY: HouseholdSortField = 'createdAt'
const DEFAULT_SORT_ORDER = 'DESC' as const

function parseSortField(value: string | undefined): HouseholdSortField {
  return SORT_FIELDS.includes(value as HouseholdSortField)
    ? (value as HouseholdSortField)
    : DEFAULT_SORT_BY
}

export function useHouseholdFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Stored in the URL as 'field:order' so a sorted view is bookmarkable. The
  // field stays in domain casing; `toListQuery` translates it for the API.
  const sortParam =
    searchParams.get('sort') ?? `${DEFAULT_SORT_BY}:${DEFAULT_SORT_ORDER.toLowerCase()}`
  const [sortByRaw, sortOrderRaw] = sortParam.split(':')

  const filters: HouseholdFilters = {
    page: Number(searchParams.get('page') ?? '1'),
    search: searchParams.get('search') ?? '',
    // An unrecognised ?sort= falls back rather than reaching the API as an
    // invalid sort_by and earning a 400.
    sortBy: parseSortField(sortByRaw),
    sortOrder: sortOrderRaw?.toUpperCase() === 'ASC' ? 'ASC' : DEFAULT_SORT_ORDER,
  }

  const setSearch = (search: string) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      if (search) next.set('search', search)
      else next.delete('search')
      next.set('page', '1')
      return next
    })
  }

  const setSort = (sortBy: HouseholdSortField, sortOrder: 'ASC' | 'DESC' = 'DESC') => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('sort', `${sortBy}:${sortOrder.toLowerCase()}`)
      return next
    })
  }

  const setPage = (page: number) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('page', String(page))
      return next
    })
  }

  return { filters, setSearch, setSort, setPage }
}
