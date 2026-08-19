import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'

export const handlers: HttpHandler[] = [
  // Default: anonymous. Tests that need a signed-in operator override this with
  // server.use(...). AuthProvider calls /auth/me on every mount, so a default
  // keeps unrelated tests from tripping onUnhandledRequest: 'error'.
  http.get('*/api/v1/console/auth/me', () =>
    HttpResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    ),
  ),
]
