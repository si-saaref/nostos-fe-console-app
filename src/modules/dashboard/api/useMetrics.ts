import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'
import type { DashboardMetrics } from '../types'

export function useMetrics() {
  return useQuery({
    queryKey: ['console', 'metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const response = await apiClient.get<{ success: boolean; data: DashboardMetrics }>(
        '/api/v1/console/dashboard/metrics',
      )
      return unwrapBackendResponse<DashboardMetrics>(response.data)
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
  })
}
