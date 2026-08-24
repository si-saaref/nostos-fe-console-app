import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribe to a media query.
 *
 * Used to render *either* the register's table or its stacked cards, never
 * both. Rendering both and hiding one with `md:hidden` would put every
 * household in the DOM twice — two of every name for a screen reader walking
 * the page, and two of every row for anything querying it.
 *
 * `useSyncExternalStore` rather than state plus an effect: matchMedia *is* an
 * external store, and reading it into state means a render with the wrong
 * answer before the effect corrects it.
 *
 * Falls back to true — the desktop presentation — where matchMedia is missing.
 * Desktop is the committed target, so it is the honest default for an
 * environment that cannot tell us.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}

      const list = window.matchMedia(query)
      list.addEventListener('change', onStoreChange)
      return () => list.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}

/** The system's one breakpoint, matching Tailwind's `md`. */
export const DESKTOP_QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}
