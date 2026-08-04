import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'

export interface SigninCallbackResponse {
  email: string
  message: string
}

export function useSigninCallback(token: string | undefined) {
  return useQuery({
    queryKey: ['console', 'auth', 'signin', token],
    queryFn: async (): Promise<SigninCallbackResponse> => {
      if (!token) {
        throw new Error('Invalid token')
      }
      const response = await apiClient.get<{ success: boolean; data: SigninCallbackResponse }>(
        `/api/v1/console/auth/signin/${token}`,
      )
      return unwrapBackendResponse<SigninCallbackResponse>(response.data)
    },
    enabled: !!token,
    retry: false,
  })
}
