import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { DashboardMetrics } from '../types'

export function useMetrics() {
  return useQuery({
    queryKey: ['console', 'metrics'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardMetrics>('/console/dashboard/metrics')
      return response.data
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
  })
}
