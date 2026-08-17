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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div role="status" aria-live="polite">
        Validating signin link...
      </div>
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #007aff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
