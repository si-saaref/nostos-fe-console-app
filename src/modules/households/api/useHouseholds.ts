import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { HouseholdFilters, HouseholdsListResponse, HouseholdsBackendResponse } from '../types'

export function useHouseholds(filters: HouseholdFilters) {
  return useQuery({
    queryKey: ['console', 'households', filters],
    queryFn: async () => {
      const response = await apiClient.get<HouseholdsBackendResponse>('/console/households', {
        params: filters,
      })

      // Transform backend response to frontend format
      const backend = response.data
      return {
        data: backend.households.map(h => ({
          id: h.id,
          name: h.name,
          adminName: h.admin_name,
          adminEmail: h.admin_email,
          createdAt: h.created_at,
          memberCount: h.member_count,
          status: h.status,
        })),
        page: backend.pagination.page,
        totalPages: backend.pagination.total_pages,
        total: backend.pagination.total,
      } as HouseholdsListResponse
    },
    placeholderData: keepPreviousData,
  })
}
