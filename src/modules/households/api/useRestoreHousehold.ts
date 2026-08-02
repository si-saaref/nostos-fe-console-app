import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { getBackendErrorMessage } from '@/utils/responseHandlers'
import type { RestoreHouseholdResponse } from '../types'

export function useRestoreHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string) => {
      const { data } = await apiClient.post<RestoreHouseholdResponse>(
        `/console/households/${householdId}/restore`,
        {},
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
      queryClient.invalidateQueries({ queryKey: ['console', 'household', data.household_id] })
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error)
      throw new Error(message)
    },
  })
}
