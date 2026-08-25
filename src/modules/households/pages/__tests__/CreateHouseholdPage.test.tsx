import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { CreateHouseholdPage } from '../CreateHouseholdPage'

describe('CreateHouseholdPage', () => {
  it('renders create household form', () => {
    renderWithProviders(
      <Routes>
        <Route path="/households/new" element={<CreateHouseholdPage />} />
      </Routes>,
      { route: '/households/new' },
    )

    expect(screen.getByText('Create Household')).toBeInTheDocument()
    expect(screen.getByLabelText(/Household Name/)).toBeInTheDocument()
  })

  it('navigates to household detail page on success', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('*/console/households', () =>
        HttpResponse.json(
          {
            success: true,
            message: 'Household created',
            data: {
              household_id: 'h-new',
              admin_id: 'a-new',
              admin_email: 'admin@newfamily.com',
              invite_sent_at: '2026-08-02T10:00:00.000Z',
            },
          },
          { status: 201 },
        ),
      ),
    )

    renderWithProviders(
      <Routes>
        <Route path="/households/new" element={<CreateHouseholdPage />} />
        <Route path="/households/:id" element={<div>Detail Page for {'{id}'}</div>} />
      </Routes>,
      { route: '/households/new' },
    )

    const nameInput = screen.getByLabelText(/Household Name/)
    const emailInput = screen.getByLabelText(/Admin Email/)
    const adminNameInput = screen.getByLabelText(/Admin Name/)

    await user.type(nameInput, 'New Family')
    await user.type(emailInput, 'admin@newfamily.com')
    await user.type(adminNameInput, 'Admin')

    await user.click(screen.getByText('Create'))

    // Verify we navigated to the detail page by checking if the form is gone
    await waitFor(() => {
      expect(screen.queryByLabelText(/Household Name/)).not.toBeInTheDocument()
    })
  })
})
