import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'

export interface Operator {
  id: string
  email: string
  role: string
}

export const OPERATOR_SESSION_QUERY_KEY = ['console', 'auth', 'me'] as const

const MAX_RETRIES = 2

/**
 * A 401 is a definitive answer: this session is gone. Anything else — a network
 * blip, a 5xx — says nothing about the session, so retry rather than ejecting an
 * operator whose session is fine and whose server briefly is not.
 */
export function shouldRetrySession(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401 || status === 403) return false
  }
  return failureCount < MAX_RETRIES
}

export function useOperatorSession({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    queryKey: OPERATOR_SESSION_QUERY_KEY,
    queryFn: async (): Promise<Operator> => {
      const response = await apiClient.get<{ success: boolean; data: Operator }>(
        '/api/v1/console/auth/me',
      )
      return unwrapBackendResponse<Operator>(response.data)
    },
    staleTime: Infinity,
    retry: shouldRetrySession,
  })
}
