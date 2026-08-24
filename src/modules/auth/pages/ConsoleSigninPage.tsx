import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useToast } from '@/components/toastContext'
import { useSignin } from '@/api/mutations/useSignin'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { ConsoleSigninForm } from '../components/ConsoleSigninForm'

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
    <div className="flex min-h-svh flex-col bg-canvas">
      {/* The same navy field as the console's top bar, carrying only the
          wordmark: there is no session yet, so there is nothing to navigate. */}
      <header className="border-b border-navy-edge bg-navy text-ink-inverse">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-3 md:px-6 md:py-4">
          <p className="text-sm font-semibold tracking-[0.16em] whitespace-nowrap uppercase text-ink-inverse">
            Nostos Operator Console
          </p>
        </div>
      </header>

      <div className="flex grow items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] rounded-lg border border-line bg-surface p-6 shadow-rest md:p-8">
          <h1>Sign In</h1>
          <p className="mt-2 mb-6 text-md text-ink-2">
            We'll email you a single-use link to sign in. No password required.
          </p>

          <ConsoleSigninForm onSubmit={handleSubmit} isLoading={isPending} />

          <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
            {[
              'Only addresses already authorized for the console can sign in.',
              'Five signin requests per address each hour.',
            ].map((note) => (
              <li key={note} className="relative pl-4 text-sm text-ink-2">
                <span
                  aria-hidden="true"
                  className="absolute top-2 left-0 h-1 w-1 rounded-full bg-ink-3"
                />
                {note}
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-line pt-4 text-sm text-ink-2">
            Don't have access?{' '}
            <a href="mailto:support@nostos.com" className="text-navy">
              Contact support@nostos.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
