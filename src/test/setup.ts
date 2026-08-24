import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './msw/server'

/**
 * jsdom ships a `matchMedia` that answers `false` to everything, which would
 * put every responsive component into its mobile branch regardless of the
 * viewport under test. This one actually evaluates `min-width` / `max-width`
 * against `window.innerWidth` (1024 by default in jsdom), so the tests see the
 * desktop presentation unless a test narrows the window itself.
 */
vi.stubGlobal(
  'matchMedia',
  (query: string): MediaQueryList => {
    const evaluate = () => {
      const min = /\(min-width:\s*(\d+)px\)/.exec(query)
      const max = /\(max-width:\s*(\d+)px\)/.exec(query)
      if (min) return window.innerWidth >= Number(min[1])
      if (max) return window.innerWidth <= Number(max[1])
      return false
    }

    return {
      get matches() {
        return evaluate()
      },
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  },
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
