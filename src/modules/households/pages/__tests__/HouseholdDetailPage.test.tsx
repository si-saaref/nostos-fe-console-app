import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { HouseholdDetailPage } from '../HouseholdDetailPage'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

const detailPayload = {
  household: {
    id: ID,
    name: 'Adios Family',
    status: 'ACTIVE',
    created_at: '2026-07-15T00:00:00.000Z',
    deletion_requested_at: null,
    scheduled_deletion_date: null,
  },
  admin: {
    id: 'a1',
    name: 'Javier',
    email: 'javier@adios.com',
    claim_status: 'CLAIMED',
    invite_sent_at: '2026-07-15T00:00:00.000Z',
    invite_expires_at: '2026-07-17T00:00:00.000Z',
    claimed_at: '2026-07-15T01:00:00.000Z',
    last_login_at: '2026-07-30T14:15:00.000Z',
  },
  members: [
    {
      id: 'm1',
      name: 'Sofia',
      email: 'sofia@adios.com',
      role: 'MEMBER',
      joined_at: '2026-07-16T00:00:00.000Z',
      last_login_at: null,
    },
  ],
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/console/households/:id" element={<HouseholdDetailPage />} />
    </Routes>,
    { route: `/console/households/${ID}` },
  )
}

describe('HouseholdDetailPage', () => {
  it('renders household, admin, and members info', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({ success: true, data: detailPayload }),
      ),
    )

    renderPage()

    await waitFor(() => expect(screen.getByText(/sofia@adios.com/)).toBeInTheDocument(), {
      timeout: 3000,
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Adios Family' })).toBeInTheDocument()
    expect(screen.getByText('Status: Claimed')).toBeInTheDocument()
  })

  it('says so when the household has no admin, instead of crashing', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({
          success: true,
          data: { ...detailPayload, admin: null, members: [] },
        }),
      ),
    )

    renderPage()

    await waitFor(() => expect(screen.getByText(/no admin/i)).toBeInTheDocument())
  })

  it('shows the backend message on a 404 instead of loading forever', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Household not found',
              status_code: 404,
              timestamp: '2026-07-15T00:00:00.000Z',
              path: `/api/v1/console/households/${ID}`,
            },
          },
          { status: 404 },
        ),
      ),
    )

    renderPage()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Household not found'))
    expect(screen.queryByText(/loading household/i)).not.toBeInTheDocument()
  })
})
