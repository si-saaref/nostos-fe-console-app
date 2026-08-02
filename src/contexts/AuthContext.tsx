import { createContext, useEffect, type ReactNode } from 'react'
import { isAxiosError } from 'axios'
import { apiClient } from '@/api/client'
import { useToast } from '@/components/ToastProvider'
import { useSession } from '@/api/queries/useSession'

export interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useSession()
  const toast = useToast()

  useEffect(() => {
    const interceptorId = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error) && error.response?.status === 403) {
          toast.error('You do not have permission to perform this action')
        }
        return Promise.reject(error)
      },
    )
    return () => apiClient.interceptors.response.eject(interceptorId)
  }, [toast])

  const value: AuthContextValue = {
    isAuthenticated: !isError && !!data,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
