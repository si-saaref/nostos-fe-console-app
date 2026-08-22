import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapEnvelope } from '@/utils/responseHandlers'
import type { HouseholdDetail } from '../types'
import { toHouseholdDetail } from './wire'
import type { HouseholdDetailWire } from './wire'

export function useHousehold(id: string) {
  return useQuery({
    // Plural, so invalidating ['console','households'] reaches it.
    queryKey: ['console', 'households', id],
    queryFn: async (): Promise<HouseholdDetail> => {
      const response = await apiClient.get<unknown>(`/api/v1/console/households/${id}`)
      return toHouseholdDetail(unwrapEnvelope<HouseholdDetailWire>(response.data))
    },
    enabled: !!id,
  })
}
