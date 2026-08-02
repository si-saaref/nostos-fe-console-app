import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export function useSignin() {
  return useMutation({
    mutationFn: async (email: string) => {
      await apiClient.post('/console/auth/signin', { email })
    },
  })
}
