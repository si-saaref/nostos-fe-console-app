import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { apiClient } from '../client'

describe('apiClient', () => {
  it('rejects errors as-is when they have a response', async () => {
    server.use(
      http.get('*/console/__test-error', () => HttpResponse.json({ message: 'error' }, { status: 500 })),
    )

    await expect(apiClient.get('/console/__test-error')).rejects.toMatchObject({
      response: { status: 500 },
    })
  })

  it('has a response interceptor configured', () => {
    expect(apiClient.interceptors.response.handlers).toBeDefined()
    expect(apiClient.interceptors.response.handlers.length).toBeGreaterThan(0)
  })

  it('sets axios baseURL for API requests', () => {
    expect(apiClient.defaults.baseURL).toBeDefined()
  })

  it('enables credentials for cross-origin requests', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })
})
