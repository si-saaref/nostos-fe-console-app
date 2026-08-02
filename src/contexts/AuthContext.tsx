import { createContext, useEffect, type ReactNode } from 'react'
import { isAxiosError } from 'axios'
import { apiClient } from '@/api/client'
import { useToast } from '@/components/ToastProvider'

export interface AuthContextValue {
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
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
    // Authentication is cookie-based; the 401 interceptor in apiClient handles invalid sessions
    isAuthenticated: true,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
