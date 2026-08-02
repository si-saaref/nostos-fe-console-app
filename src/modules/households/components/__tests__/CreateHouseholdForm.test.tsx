import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { CreateHouseholdForm } from '../CreateHouseholdForm'

describe('CreateHouseholdForm', () => {
  it('renders form fields and validates input', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    expect(screen.getByLabelText(/Household Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Admin Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Admin Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post('*/console/households', () =>
        HttpResponse.json({
          success: true,
          household_id: 'hhd_123',
          admin_id: 'usr_456',
          invite_sent_at: '2026-08-02T10:00:00Z',
          message: 'Household created',
        }),
      ),
    )

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    const nameInput = screen.getByLabelText(/Household Name/)
    const emailInput = screen.getByLabelText(/Admin Email/)
    const adminNameInput = screen.getByLabelText(/Admin Name/)

    await user.type(nameInput, 'Test Family')
    await user.type(emailInput, 'test@example.com')
    await user.type(adminNameInput, 'Test Admin')

    await user.click(screen.getByText('Create'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('hhd_123'))
  })

  it('shows validation error for invalid email', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    const emailInput = screen.getByLabelText(/Admin Email/)
    await user.type(emailInput, 'invalid-email')
    await user.tab() // blur

    await waitFor(() => {
      expect(screen.getByText(/Invalid email format/)).toBeInTheDocument()
    })
  })

  it('shows character count for household name', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    const nameInput = screen.getByLabelText(/Household Name/)
    await user.type(nameInput, 'Test')

    expect(screen.getByText('4/100')).toBeInTheDocument()
  })

  it('disables button while submitting', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post('*/console/households', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          success: true,
          household_id: 'hhd_123',
          admin_id: 'usr_456',
          invite_sent_at: '2026-08-02T10:00:00Z',
          message: 'Household created',
        })
      }),
    )

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    const nameInput = screen.getByLabelText(/Household Name/)
    const emailInput = screen.getByLabelText(/Admin Email/)
    const adminNameInput = screen.getByLabelText(/Admin Name/)

    await user.type(nameInput, 'Test Family')
    await user.type(emailInput, 'test@example.com')
    await user.type(adminNameInput, 'Test Admin')

    const createButton = screen.getByText('Create')
    await user.click(createButton)

    expect(screen.getByText('Creating...')).toBeInTheDocument()
  })
})
