import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapEnvelope } from '@/utils/responseHandlers'
import type { CreateHouseholdInput, CreatedHousehold } from '../types'
import { toCreateHouseholdBody, toCreatedHousehold } from './wire'
import type { CreatedHouseholdWire } from './wire'

export function useCreateHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput): Promise<CreatedHousehold> => {
      const response = await apiClient.post<unknown>(
        '/api/v1/console/households',
        toCreateHouseholdBody(input),
      )
      return toCreatedHousehold(unwrapEnvelope<CreatedHouseholdWire>(response.data))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
    },
  })
}
