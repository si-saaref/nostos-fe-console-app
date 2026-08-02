import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'
import type { DeleteHouseholdResponse } from '../types'

export function useDeleteHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string) => {
      const response = await apiClient.post<{ success: boolean; data: DeleteHouseholdResponse }>(
        `/console/households/${householdId}/delete`,
        { confirmation: 'DELETE' },
      )
      return unwrapBackendResponse<DeleteHouseholdResponse>(response.data)
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
        queryClient.invalidateQueries({ queryKey: ['console', 'household', data.household_id] })
      }
    },
  })
}
