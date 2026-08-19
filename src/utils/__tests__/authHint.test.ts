import { afterEach, describe, expect, it } from 'vitest'
import { SESSION_HINT_COOKIE, hasSessionHint } from '../authHint'

function clearCookies() {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0]?.trim()
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  }
}

describe('hasSessionHint', () => {
  afterEach(clearCookies)

  it('is false when no cookies are set at all', () => {
    expect(hasSessionHint()).toBe(false)
  })

  it('is true when the backend has set the hint cookie', () => {
    document.cookie = `${SESSION_HINT_COOKIE}=true; path=/`

    expect(hasSessionHint()).toBe(true)
  })

  it('is true when the hint sits among unrelated cookies', () => {
    document.cookie = '_ga_H3FE0V35T4=GS2.1.abc; path=/'
    document.cookie = `${SESSION_HINT_COOKIE}=true; path=/`
    document.cookie = 'theme=dark; path=/'

    expect(hasSessionHint()).toBe(true)
  })

  it('is false when only unrelated cookies are present', () => {
    document.cookie = '_ga_H3FE0V35T4=GS2.1.abc; path=/'

    expect(hasSessionHint()).toBe(false)
  })

  it('is false for a cookie whose name merely starts with the hint name', () => {
    document.cookie = `${SESSION_HINT_COOKIE}_shadow=true; path=/`

    expect(hasSessionHint()).toBe(false)
  })

  it('is false rather than throwing when cookie access is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() {
        throw new Error('cookies blocked')
      },
    })

    try {
      expect(hasSessionHint()).toBe(false)
    } finally {
      delete (document as unknown as { cookie?: unknown }).cookie
      if (original) Object.defineProperty(Document.prototype, 'cookie', original)
    }
  })
})
