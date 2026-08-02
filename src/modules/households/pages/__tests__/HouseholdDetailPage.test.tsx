import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { HouseholdDetailPage } from '../HouseholdDetailPage'

const detail = {
  id: '1',
  name: 'Adios Family',
  status: 'ACTIVE' as const,
  createdAt: '2026-07-15T00:00:00.000Z',
  scheduledDeletionDate: null,
  admin: {
    id: 'admin-1',
    name: 'Javier',
    email: 'javier@adios.com',
    claimStatus: 'CLAIMED' as const,
    claimedAt: '2026-07-15T01:00:00.000Z',
    lastLoginAt: '2026-07-30T14:15:00.000Z',
  },
  members: [{ id: 'm1', name: 'Sofia', email: 'sofia@adios.com', joinedAt: '2026-07-16T00:00:00.000Z' }],
}

describe('HouseholdDetailPage', () => {
  it('renders household, admin, and members info', async () => {
    server.use(
      http.get('*/console/households/1', () =>
        HttpResponse.json({
          success: true,
          household: {
            id: detail.id,
            name: detail.name,
            status: detail.status,
            created_at: detail.createdAt,
            deletion_requested_at: null,
            scheduled_deletion_date: detail.scheduledDeletionDate,
          },
          admin: {
            id: detail.admin.id,
            name: detail.admin.name,
            email: detail.admin.email,
            claim_status: detail.admin.claimStatus,
            claimed_at: detail.admin.claimedAt,
            last_login_at: detail.admin.lastLoginAt,
          },
          members: detail.members.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: 'MEMBER',
            joined_at: m.joinedAt,
            last_activity_at: null,
          })),
        }),
      ),
    )

    renderWithProviders(
      <Routes>
        <Route path="/console/households/:id" element={<HouseholdDetailPage />} />
      </Routes>,
      { route: '/console/households/1' },
    )

    await waitFor(() => expect(screen.getByText('Adios Family')).toBeInTheDocument())
    expect(screen.getByText('Javier')).toBeInTheDocument()
    expect(screen.getByText(/sofia@adios.com/)).toBeInTheDocument()
  })
})
