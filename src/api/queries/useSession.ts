import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'

export interface Session {
  email: string
}

export const SESSION_QUERY_KEY = ['console', 'auth', 'session'] as const

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Session }>('/api/v1/console/auth/session')
      return unwrapBackendResponse(response.data)
    },
    retry: false,
    staleTime: Infinity,
  })
}
