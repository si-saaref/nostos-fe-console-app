import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/Button'
import { Field, Input } from '@/components/Field'
import { CheckCircleMark } from '@/components/icons'

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
  } = useForm<SigninFormValues>({ mode: 'onBlur' })

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
      <div className="text-center">
        <div className="mb-3 flex justify-center text-success">
          <CheckCircleMark />
        </div>
        <h2 className="mb-2 text-lg">Check your email</h2>
        <p className="mx-auto text-md text-ink-2">
          We've sent a signin link to <strong className="font-medium text-ink">{successEmail}</strong>
        </p>
        <Button className="mt-5 w-full" onClick={() => setIsSuccess(false)}>
          Try another email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Field htmlFor="signin-email" label="Enter your email" error={errors.email?.message}>
        <Input
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
      </Field>

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        aria-busy={isLoading}
        className="mt-5 h-10 w-full"
      >
        {isLoading ? (
          <>
            <span
              aria-hidden="true"
              className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-navy-border border-t-ink-inverse"
            />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  )
}
