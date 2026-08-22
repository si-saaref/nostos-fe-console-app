import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapPaginated } from '@/utils/responseHandlers'
import type { HouseholdFilters, HouseholdsListResponse } from '../types'
import { toHouseholdSummary, toListQuery, toPagination } from './wire'
import type { HouseholdListItemWire } from './wire'

export function useHouseholds(filters: HouseholdFilters) {
  return useQuery({
    queryKey: ['console', 'households', filters],
    queryFn: async (): Promise<HouseholdsListResponse> => {
      const response = await apiClient.get<unknown>('/api/v1/console/households', {
        params: toListQuery(filters),
      })

      // `data` is a bare array here; the counts live in `meta.pagination`.
      const { items, pagination } = unwrapPaginated<HouseholdListItemWire>(response.data)

      return {
        households: items.map(toHouseholdSummary),
        pagination: toPagination(pagination),
      }
    },
    placeholderData: keepPreviousData,
  })
}
