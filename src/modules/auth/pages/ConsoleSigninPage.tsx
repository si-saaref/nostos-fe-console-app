import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useToast } from '@/components/ToastProvider'
import { useSignin } from '@/api/mutations/useSignin'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { ConsoleSigninForm } from '../components/ConsoleSigninForm'

export function ConsoleSigninPage() {
  const { isAuthenticated, isLoading: isSessionLoading } = useAuth()
  const toast = useToast()
  const { mutate, isPending, reset } = useSignin()

  if (!isSessionLoading && isAuthenticated) {
    return <Navigate to="/console/dashboard" replace />
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
    <main>
      <h1>Nostos Operator Console</h1>
      <ConsoleSigninForm onSubmit={handleSubmit} isLoading={isPending} />
      <p>
        Don't have access? Contact <a href="mailto:support@nostos.com">support@nostos.com</a>
      </p>
    </main>
  )
}
