import { useSearchParams } from 'react-router-dom'
import type { HouseholdFilters } from '../types'

const DEFAULT_SORT = 'createdAt:desc'

export function useHouseholdFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: HouseholdFilters = {
    page: Number(searchParams.get('page') ?? '1'),
    search: searchParams.get('search') ?? '',
    sort: searchParams.get('sort') ?? DEFAULT_SORT,
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

  const setSort = (sort: string) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('sort', sort)
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
