import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSigninCallback } from '@/api/mutations/useSigninCallback'
import { useToast } from '@/components/toastContext'
import { useAuth } from '@/contexts/useAuth'
import { LoadingSheet } from '@/components/LoadingSheet'
import { getErrorMessage } from '@/utils/apiErrorMessages'

export function ConsoleSigninCallbackPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { refreshSession } = useAuth()
  const { isLoading, isError, error } = useSigninCallback(token)

  useEffect(() => {
    if (isError) {
      toast.error(getErrorMessage(error))
      navigate('/signin', { replace: true })
    }
  }, [isError, error, toast, navigate])

  useEffect(() => {
    if (!isLoading && !isError && token) {
      // The server has set the session cookie on the exchange response. It only
      // returned the email, so pull the full operator from /auth/me.
      refreshSession()
      navigate('/', { replace: true })
    }
  }, [isLoading, isError, token, refreshSession, navigate])

  return <LoadingSheet message="Validating signin link..." />
}
