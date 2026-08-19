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
    <div className="signin">
      <header className="registry-head">
        <div className="registry-head-inner">
          <p className="registry-head-mark">Nostos Operator Console</p>
        </div>
      </header>

      <div className="signin-body">
        <div className="signin-card card">
          <div className="card-body">
            <h1 className="signin-title">Sign In</h1>
            <p className="signin-intro">
              We'll email you a single-use link to sign in. No password required.
            </p>

            <ConsoleSigninForm onSubmit={handleSubmit} isLoading={isPending} />

            <ul className="signin-notes">
              <li>Only addresses already authorized for the console can sign in.</li>
              <li>Five signin requests per address each hour.</li>
            </ul>

            <p className="signin-support">
              Don't have access? <a href="mailto:support@nostos.com">Contact support@nostos.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
