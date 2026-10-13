import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useHousehold } from '../useHousehold'

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
    claim_status: 'PENDING_INVITE',
    invite_sent_at: '2026-07-15T00:00:00.000Z',
    invite_expires_at: '2026-07-17T00:00:00.000Z',
    claimed_at: null,
    last_login_at: null,
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

const notFound = {
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'Household not found',
    status_code: 404,
    timestamp: '2026-07-15T00:00:00.000Z',
    path: `/api/v1/console/households/${ID}`,
  },
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useHousehold', () => {
  it('unwraps and maps the detail payload', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({ success: true, data: detailPayload }),
      ),
    )

    const { result } = renderHook(() => useHousehold(ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.household.name).toBe('Adios Family')
    expect(result.current.data?.admin?.claimStatus).toBe('PENDING_INVITE')
    expect(result.current.data?.admin?.inviteExpiresAt).toBe('2026-07-17T00:00:00.000Z')
    expect(result.current.data?.members[0].role).toBe('MEMBER')
  })

  it('tolerates a household with no admin', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({ success: true, data: { ...detailPayload, admin: null, members: [] } }),
      ),
    )

    const { result } = renderHook(() => useHousehold(ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.admin).toBeNull()
  })

  it('errors on a 404 instead of resolving with undefined', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json(notFound, { status: 404 }),
      ),
    )

    const { result } = renderHook(() => useHousehold(ID), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('registers under the plural households key', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({ success: true, data: detailPayload }),
      ),
    )

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHousehold(ID), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(['console', 'households', ID])).toBeDefined()
  })

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useHousehold(''), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
