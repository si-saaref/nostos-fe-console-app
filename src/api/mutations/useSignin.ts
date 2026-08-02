import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'

export function useSignin() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post('/console/auth/signin', { email })
      // Unwrap success response (backend returns { success, message, email })
      return unwrapBackendResponse(response.data) || response.data
    },
  })
}
