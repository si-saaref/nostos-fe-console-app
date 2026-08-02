import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
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
  })
}
