import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { ResendInviteResponse } from '../types'

export function useResendInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string) => {
      const { data } = await apiClient.post<ResendInviteResponse>(
        `/console/households/${householdId}/admin/resend-invite`,
        {},
      )
      return data
    },
    onSuccess: (_data, householdId) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'household', householdId] })
    },
  })
}
