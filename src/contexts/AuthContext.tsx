import { createContext, useEffect, useState, type ReactNode } from 'react'
import { isAxiosError } from 'axios'
import { apiClient } from '@/api/client'
import { useToast } from '@/components/ToastProvider'

export interface AuthContextValue {
  isAuthenticated: boolean
  logout: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(true)

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

  const logout = () => {
    setIsAuthenticated(false)
  }

  const value: AuthContextValue = {
    isAuthenticated,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
