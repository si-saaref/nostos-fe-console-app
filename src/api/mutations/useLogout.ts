import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { useAuth } from '@/contexts/useAuth'

export function useLogout() {
  const navigate = useNavigate()
  const { logout: clearAuth } = useAuth()

  return useMutation({
    mutationFn: async () => {
      try {
        // Backend spec: POST /console/auth/logout destroys session
        await apiClient.post('/api/v1/console/auth/logout')
      } catch {
        // Even if logout API fails, clear the auth state on frontend
        // The session cookie is what matters for the backend
      }
    },
    onSuccess: () => {
      clearAuth()
      navigate('/signin', { replace: true })
    },
    onError: () => {
      clearAuth()
      navigate('/signin', { replace: true })
    },
  })
}
