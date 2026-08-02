import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export interface Session {
  email: string
}

export const SESSION_QUERY_KEY = ['console', 'auth', 'session'] as const

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Session>('/console/auth/session')
      return response.data
    },
    retry: false,
    staleTime: Infinity,
  })
}
