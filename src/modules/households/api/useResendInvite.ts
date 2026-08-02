import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'
import type { ResendInviteResponse } from '../types'

export function useResendInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string) => {
      const response = await apiClient.post<{ success: boolean; data: ResendInviteResponse }>(
        `/console/households/${householdId}/admin/resend-invite`,
        {},
      )
      return unwrapBackendResponse<ResendInviteResponse>(response.data)
    },
    onSuccess: (_data, householdId) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'household', householdId] })
    },
  })
}
