import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { getBackendErrorMessage } from '@/utils/responseHandlers'
import type { CreateHouseholdInput, CreateHouseholdResponse } from '../types'

export function useCreateHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput) => {
      const { data } = await apiClient.post<CreateHouseholdResponse>(
        '/console/households',
        input,
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error)
      throw new Error(message)
    },
  })
}
