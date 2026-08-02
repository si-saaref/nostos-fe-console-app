import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'
import type { RestoreHouseholdResponse } from '../types'

export function useRestoreHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string) => {
      const response = await apiClient.post<{ success: boolean; data: RestoreHouseholdResponse }>(
        `/console/households/${householdId}/restore`,
        {},
      )
      return unwrapBackendResponse<RestoreHouseholdResponse>(response.data)
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
        queryClient.invalidateQueries({ queryKey: ['console', 'household', data.household_id] })
      }
    },
  })
}
