import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSigninCallback } from '@/api/mutations/useSigninCallback'
import { useToast } from '@/components/ToastProvider'

export function ConsoleSigninCallbackPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { isLoading, isError, error } = useSigninCallback(token)

  useEffect(() => {
    if (isError) {
      const errorMessage = error instanceof Error ? error.message : 'Link invalid or expired'
      toast.error(errorMessage)
      navigate('/console/signin', { replace: true })
    }
  }, [isError, error, toast, navigate])

  useEffect(() => {
    if (!isLoading && !isError && token) {
      // On success, the session cookie is set by the server
      // Redirect to dashboard
      navigate('/console/dashboard', { replace: true })
    }
  }, [isLoading, isError, token, navigate])

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
