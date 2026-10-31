import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { CreateHouseholdForm } from '../CreateHouseholdForm'
import type { CreatedHousehold } from '../../types'

const FORM_ID = 'create-household-form'

/**
 * The form no longer owns its submit button — it lives in the dialog footer and
 * reaches the form through the HTML `form` attribute. This harness is that
 * arrangement, so the tests exercise the same wiring CreateHouseholdPage uses
 * rather than a shape that no longer ships.
 */
function Harness({ onSuccess }: { onSuccess: (created: CreatedHousehold) => void }) {
  const [isPending, setIsPending] = useState(false)

  return (
    <>
      <CreateHouseholdForm
        formId={FORM_ID}
        onSuccess={onSuccess}
        onPendingChange={setIsPending}
      />
      <button type="submit" form={FORM_ID} disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </>
  )
}

const created = {
  success: true,
  message: 'Household created',
  data: {
    household_id: 'h-new',
    admin_id: 'a-new',
    admin_email: 'test@example.com',
    invite_sent_at: '2026-08-02T10:00:00.000Z',
  },
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Household Name/), 'José Family')
  await user.type(screen.getByLabelText(/Admin Email/), 'test@example.com')
  await user.type(screen.getByLabelText(/Admin First Name/), 'Test')
  await user.type(screen.getByLabelText(/Admin Last Name/), "O’Neill-Smith")
}

describe('CreateHouseholdForm', () => {
  it('renders form fields and validates input', async () => {
    const onSuccess = vi.fn()

    renderWithProviders(<Harness onSuccess={onSuccess} />)

    expect(screen.getByLabelText(/Household Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Admin Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Admin First Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Admin Last Name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
  })

  it('submits a snake_case body and reports the new household id', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    let submitted: Record<string, unknown> | undefined

    server.use(
      http.post('*/api/v1/console/households', async ({ request }) => {
        submitted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(created, { status: 201 })
      }),
    )

    renderWithProviders(<Harness onSuccess={onSuccess} />)
    await fillRequiredFields(user)
    await user.click(screen.getByText('Create'))

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ householdId: 'h-new', adminEmail: 'test@example.com' }),
      ),
    )
    expect(submitted).toEqual({
      household_name: 'José Family',
      admin_email: 'test@example.com',
      admin_first_name: 'Test',
      admin_last_name: 'O’Neill-Smith',
    })
  })

  it('shows the backend message when the household name is taken', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post('*/api/v1/console/households', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Household name already in use',
              status_code: 409,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: '/api/v1/console/households',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderWithProviders(<Harness onSuccess={onSuccess} />)
    await fillRequiredFields(user)
    await user.click(screen.getByText('Create'))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Household name already in use'),
    )
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it.each([
    ['admin_email', /Admin Email/, 'admin_email must be an email'],
    ['admin_first_name', /Admin First Name/, 'admin_first_name must be shorter than or equal to 50 characters'],
    ['admin_last_name', /Admin Last Name/, 'admin_last_name must be shorter than or equal to 50 characters'],
  ])('attaches the backend %s error to its own input', async (field, label, message) => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post('*/api/v1/console/households', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: '/api/v1/console/households',
              details: [
                {
                  field,
                  code: 'VALIDATION_ERROR',
                  message,
                },
              ],
            },
          },
          { status: 400 },
        ),
      ),
    )

    renderWithProviders(<Harness onSuccess={onSuccess} />)
    await fillRequiredFields(user)
    await user.click(screen.getByText('Create'))

    await waitFor(() =>
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message),
    )
  })

  it('requires both structured names before making a request', async () => {
    let requests = 0
    server.use(http.post('*/api/v1/console/households', () => {
      requests += 1
      return HttpResponse.json(created, { status: 201 })
    }))
    const user = userEvent.setup()
    renderWithProviders(<Harness onSuccess={vi.fn()} />)
    await user.type(screen.getByLabelText(/Household Name/), 'José Family')
    await user.type(screen.getByLabelText(/Admin Email/), 'test@example.com')
    await user.type(screen.getByLabelText(/Admin First Name/), '   ')
    await user.click(screen.getByText('Create'))
    expect(screen.getByText('Admin first name is required')).toBeInTheDocument()
    expect(screen.getByText('Admin last name is required')).toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it('shows validation error for invalid email', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<Harness onSuccess={onSuccess} />)

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

    renderWithProviders(<Harness onSuccess={onSuccess} />)

    const nameInput = screen.getByLabelText(/Household Name/)
    await user.type(nameInput, 'Test')

    expect(screen.getByText('4/100')).toBeInTheDocument()
  })

  it('disables button while submitting', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post('*/api/v1/console/households', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json(created, { status: 201 })
      }),
    )

    renderWithProviders(<Harness onSuccess={onSuccess} />)
    await fillRequiredFields(user)
    await user.click(screen.getByText('Create'))

    expect(screen.getByText('Creating...')).toBeInTheDocument()
  })
})
