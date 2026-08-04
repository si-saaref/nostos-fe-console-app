import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'

export const handlers: HttpHandler[] = [
  // Default session handler - can be overridden in tests
  http.get('*/console/auth/session', () =>
    HttpResponse.json({
      success: true,
      data: { email: 'operator@test.com' },
    }),
  ),
]
