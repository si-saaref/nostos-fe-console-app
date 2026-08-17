import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useToast } from '@/components/ToastProvider'
import { useSignin } from '@/api/mutations/useSignin'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { ConsoleSigninForm } from '../components/ConsoleSigninForm'
import './signin.css'

export function ConsoleSigninPage() {
  const { status } = useAuth()
  const toast = useToast()
  const { mutate, isPending, reset } = useSignin()

  // Only on a *confirmed* session, never on a provisional one: acting on a stale
  // hint here would ricochet the operator signin -> dashboard -> signin. Briefly
  // showing this form before a legitimate bounce is harmless by comparison.
  if (status === 'authenticated') {
    return <Navigate to="/console" replace />
  }

  const handleSubmit = (email: string) => {
    mutate(email, {
      onSuccess: () => {
        toast.success('Check your email for a signin link')
        reset()
      },
      onError: (error) => {
        toast.error(getErrorMessage(error))
      },
    })
  }

  return (
    <div className="signin-container">
      {/* Hero Panel */}
      <div className="signin-hero">
        <div className="signin-hero-content">
          <h2>Operate with confidence</h2>
          <p>Manage households and members from a unified, secure console built for operators.</p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="signin-form-container">
        <div className="signin-form-wrapper">
          <div className="signin-form-header">
            <h1>Sign In</h1>
            <p>to Nostos Operator Console</p>
          </div>

          <ConsoleSigninForm onSubmit={handleSubmit} isLoading={isPending} />

          <div className="signin-support">
            Don't have access?{' '}
            <a href="mailto:support@nostos.com">Contact support@nostos.com</a>
          </div>
        </div>
      </div>
    </div>
  )
}
