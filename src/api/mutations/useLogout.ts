import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { apiClient } from '@/api/client'
import { useAuth } from '@/contexts/useAuth'
import { useToast } from '@/components/toastContext'
import { getErrorMessage } from '@/utils/apiErrorMessages'

export function useLogout() {
  const navigate = useNavigate()
  const { logout: clearAuth } = useAuth()
  const toast = useToast()

  return useMutation({
    mutationFn: async () => {
      try {
        // Backend spec: POST /console/auth/logout destroys session
        await apiClient.post('/api/v1/console/auth/logout')
      } catch (error) {
        // A 401 confirms the session is already gone. Other failures leave
        // server logout unconfirmed, so keep the session and allow retry.
        if (!isAxiosError(error) || error.response?.status !== 401) throw error
      }
    },
    onSuccess: () => {
      clearAuth()
      navigate('/signin', { replace: true })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}
