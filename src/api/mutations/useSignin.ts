import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'

interface SigninResponse {
  email: string
}

export function useSignin() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post<{ success: boolean; data: SigninResponse }>('/console/auth/signin', { email })
      return unwrapBackendResponse<SigninResponse>(response.data)
    },
  })
}
