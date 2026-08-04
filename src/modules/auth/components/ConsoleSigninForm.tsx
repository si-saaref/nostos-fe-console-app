import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface SigninFormValues {
  email: string
}

export interface ConsoleSigninFormProps {
  onSubmit: (email: string) => void
  isLoading: boolean
}

export function ConsoleSigninForm({ onSubmit, isLoading }: ConsoleSigninFormProps) {
  const [isSuccess, setIsSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SigninFormValues>({ mode: 'onBlur' })

  const email = watch('email')

  const handleFormSubmit = (values: SigninFormValues) => {
    setSuccessEmail(values.email)
    onSubmit(values.email)
  }

  // Reset success state when user starts typing again
  const handleEmailChange = () => {
    if (isSuccess) {
      setIsSuccess(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="signin-success-state">
        <div className="signin-success-icon">✓</div>
        <div className="signin-success-message">
          <h2>Check your email</h2>
          <p>We've sent a signin link to <strong>{successEmail}</strong></p>
          <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
            The link will expire in 24 hours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsSuccess(false)}
          className="signin-success-button"
        >
          Try another email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="signin-form">
      {/* Email Input */}
      <div className="signin-form-group">
        <label htmlFor="signin-email">Enter your email</label>
        <input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="operator@nostos.com"
          aria-required="true"
          aria-describedby={errors.email ? 'signin-email-error' : undefined}
          disabled={isLoading}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
            onChange: handleEmailChange,
          })}
        />
        {errors.email && (
          <span id="signin-email-error" role="alert" className="signin-error">
            {errors.email.message}
          </span>
        )}
      </div>

      {/* Sign In Button */}
      <button
        type="submit"
        disabled={isLoading || !email}
        className="signin-button"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <span className="signin-button-loading">
            <span className="signin-button-spinner" />
            Signing in...
          </span>
        ) : (
          <>
            <span>Sign In</span>
            <span>→</span>
          </>
        )}
      </button>
    </form>
  )
}
