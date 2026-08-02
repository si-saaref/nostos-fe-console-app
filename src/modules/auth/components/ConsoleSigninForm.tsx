import { useForm } from 'react-hook-form'

interface SigninFormValues {
  email: string
}

export interface ConsoleSigninFormProps {
  onSubmit: (email: string) => void
  isLoading: boolean
}

export function ConsoleSigninForm({ onSubmit, isLoading }: ConsoleSigninFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormValues>({ mode: 'onBlur' })

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values.email))} noValidate>
      <label htmlFor="signin-email">Enter your email</label>
      <input
        id="signin-email"
        type="email"
        autoComplete="email"
        placeholder="operator@..."
        aria-required="true"
        aria-describedby={errors.email ? 'signin-email-error' : undefined}
        disabled={isLoading}
        {...register('email', {
          required: 'Invalid email',
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
        })}
      />
      {errors.email && (
        <span id="signin-email-error" role="alert">
          {errors.email.message}
        </span>
      )}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
