import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { HouseholdFilters, HouseholdsListResponse } from '../types'

export function useHouseholds(filters: HouseholdFilters) {
  return useQuery({
    queryKey: ['console', 'households', filters],
    queryFn: async () => {
      const response = await apiClient.get<HouseholdsListResponse>('/console/households', {
        params: filters,
      })
      return response.data
    },
    placeholderData: keepPreviousData,
  })
}
