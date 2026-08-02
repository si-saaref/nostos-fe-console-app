import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import { ConsoleSigninForm } from '../ConsoleSigninForm'

describe('ConsoleSigninForm', () => {
  it('shows a validation error for an invalid email on blur', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ConsoleSigninForm onSubmit={vi.fn()} isLoading={false} />)

    const emailField = screen.getByLabelText(/email/i)
    await user.type(emailField, 'not-an-email')
    await user.tab()

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument()
  })

  it('calls onSubmit with the entered email when valid', async () => {
    const handleSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ConsoleSigninForm onSubmit={handleSubmit} isLoading={false} />)

    await user.type(screen.getByLabelText(/email/i), 'operator@nostos.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(handleSubmit).toHaveBeenCalledWith('operator@nostos.com')
  })

  it('disables the form while loading', () => {
    renderWithProviders(<ConsoleSigninForm onSubmit={vi.fn()} isLoading={true} />)

    expect(screen.getByLabelText(/email/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
