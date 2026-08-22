import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { rethrowAsApiError, unwrapEnvelope } from '@/utils/responseHandlers'
import type { ResendInvite } from '../types'
import { toResendInvite } from './wire'
import type { ResendInviteWire } from './wire'

export function useResendInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<ResendInvite> => {
      const response = await apiClient
        .post<unknown>(`/api/v1/console/households/${householdId}/admin/resend-invite`)
        .catch(rethrowAsApiError)

      return toResendInvite(unwrapEnvelope<ResendInviteWire>(response.data))
    },
    onSuccess: (_data, householdId) => {
      // Plural — a fresh invite changes the admin's claim status and expiry.
      queryClient.invalidateQueries({ queryKey: ['console', 'households', householdId] })
    },
  })
}
