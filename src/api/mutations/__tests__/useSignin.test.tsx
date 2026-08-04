import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { useSignin } from '../useSignin'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useSignin', () => {
  it('succeeds for an authorized email', async () => {
    server.use(
      http.post('*/console/auth/signin', () => HttpResponse.json({}, { status: 200 })),
    )
    const { result } = renderHook(() => useSignin(), { wrapper })

    result.current.mutate('operator@nostos.com')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('surfaces a 401 as an error', async () => {
    server.use(
      http.post('*/console/auth/signin', () =>
        HttpResponse.json({ message: 'Email not authorized to access console' }, { status: 401 }),
      ),
    )
    const { result } = renderHook(() => useSignin(), { wrapper })

    result.current.mutate('stranger@example.com')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
