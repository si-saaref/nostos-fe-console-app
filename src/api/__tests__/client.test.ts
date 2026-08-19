import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { apiClient } from '../client'

// Auth response handling (401 redirect + expiry toast, 403 toast) is registered
// by AuthProvider and covered in src/contexts/__tests__/authInterceptors.test.tsx.
// It deliberately does not live here: this module is transport configuration.

describe('apiClient', () => {
  it('rejects errors as-is when they have a response', async () => {
    server.use(
      http.get('*/console/__test-error', () =>
        HttpResponse.json({ message: 'error' }, { status: 500 }),
      ),
    )

    await expect(apiClient.get('/console/__test-error')).rejects.toMatchObject({
      response: { status: 500 },
    })
  })

  it('leaves a 401 untouched on its own, so nothing navigates outside the router', async () => {
    server.use(http.get('*/console/households', () => HttpResponse.json({}, { status: 401 })))

    await expect(apiClient.get('/api/v1/console/households')).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('sets axios baseURL for API requests', () => {
    expect(apiClient.defaults.baseURL).toBeDefined()
  })

  it('enables credentials so the session cookie travels with every request', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })
})
