import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'
import type { CreateHouseholdInput, CreateHouseholdResponse } from '../types'

export function useCreateHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput) => {
      const response = await apiClient.post<{ success: boolean; data: CreateHouseholdResponse }>(
        '/console/households',
        input,
      )
      return unwrapBackendResponse<CreateHouseholdResponse>(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
    },
  })
}
