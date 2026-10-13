import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { rethrowAsApiError, unwrapEnvelope } from '@/utils/responseHandlers'
import type { HouseholdRestore } from '../types'
import { toHouseholdRestore } from './wire'
import type { HouseholdRestoreWire } from './wire'

export function useRestoreHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<HouseholdRestore> => {
      // No body — the id in the path is the whole request.
      const response = await apiClient
        .post<unknown>(`/api/v1/console/households/${householdId}/restore`)
        .catch(rethrowAsApiError)

      return toHouseholdRestore(unwrapEnvelope<HouseholdRestoreWire>(response.data))
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
      queryClient.invalidateQueries({ queryKey: ['console', 'households', data.householdId] })
    },
  })
}
