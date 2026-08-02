import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { DeleteHouseholdResponse } from '../types'

export function useDeleteHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string) => {
      const { data } = await apiClient.post<DeleteHouseholdResponse>(
        `/console/households/${householdId}/delete`,
        { confirmation: 'DELETE' },
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
      queryClient.invalidateQueries({ queryKey: ['console', 'household', data.household_id] })
    },
  })
}
