import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSigninCallback } from '@/api/mutations/useSigninCallback'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/contexts/useAuth'
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
      navigate('/console/signin', { replace: true })
    }
  }, [isError, error, toast, navigate])

  useEffect(() => {
    if (!isLoading && !isError && token) {
      // The server has set the session cookie on the exchange response. It only
      // returned the email, so pull the full operator from /auth/me.
      refreshSession()
      navigate('/console', { replace: true })
    }
  }, [isLoading, isError, token, refreshSession, navigate])

  return (
    <div className="validating">
      <div className="validating-sheet">
        <div role="status" aria-live="polite">
          Validating signin link...
        </div>
        {/* A rule being drawn across the sheet, not a spinning circle. */}
        <div className="validating-rule" aria-hidden="true" />
      </div>
    </div>
  )
}
