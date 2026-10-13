import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { rethrowAsApiError, unwrapEnvelope } from '@/utils/responseHandlers'
import type { HouseholdDeletion } from '../types'
import { toHouseholdDeletion } from './wire'
import type { HouseholdDeletionWire } from './wire'

export function useDeleteHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<HouseholdDeletion> => {
      const response = await apiClient
        .post<unknown>(`/api/v1/console/households/${householdId}/delete`, {
          confirmation: 'DELETE',
        })
        .catch(rethrowAsApiError)

      return toHouseholdDeletion(unwrapEnvelope<HouseholdDeletionWire>(response.data))
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
      // Plural — the detail query registers under ['console','households', id].
      queryClient.invalidateQueries({ queryKey: ['console', 'households', data.householdId] })
    },
  })
}
