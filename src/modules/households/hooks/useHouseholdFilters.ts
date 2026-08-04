import { useSearchParams } from 'react-router-dom'
import type { HouseholdFilters } from '../types'

const DEFAULT_SORT_BY = 'created_at'
const DEFAULT_SORT_ORDER = 'DESC'

// Map field names from camelCase (frontend) to snake_case (backend)
const FIELD_MAPPING: Record<string, string> = {
  createdAt: 'created_at',
  name: 'name',
  adminName: 'admin_name',
  adminEmail: 'admin_email',
  memberCount: 'member_count',
}

export function useHouseholdFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse sort from URL: stored as 'fieldName:order' in URL for bookmarkability
  const sortParam = searchParams.get('sort') ?? `${DEFAULT_SORT_BY}:${DEFAULT_SORT_ORDER.toLowerCase()}`
  const [sortByRaw, sortOrderRaw] = sortParam.split(':')
  const sortBy = FIELD_MAPPING[sortByRaw] || sortByRaw
  const sortOrder = (sortOrderRaw?.toUpperCase() || DEFAULT_SORT_ORDER) as 'ASC' | 'DESC'

  const filters: HouseholdFilters = {
    page: Number(searchParams.get('page') ?? '1'),
    search: searchParams.get('search') ?? '',
    sort_by: sortBy,
    sort_order: sortOrder,
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

  const setSort = (sortByField: string, sortOrder: 'ASC' | 'DESC' = 'DESC') => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      // Store as 'fieldName:order' in URL for bookmarkability
      next.set('sort', `${sortByField}:${sortOrder.toLowerCase()}`)
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
