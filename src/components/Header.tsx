import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLogout } from '@/api/mutations/useLogout'
import { useAuth } from '@/contexts/useAuth'
import { cn } from '@/utils/cn'
import { LogoutConfirmationModal } from './LogoutConfirmationModal'
import { CloseMark, MenuMark, SignOutMark } from './icons'

/**
 * The top bar — a signature element, kept. Navy field, white uppercase wordmark
 * tracked at 0.16em, uppercase nav with a 2px underline on the active tab,
 * operator identity and sign-out pushed right. Rebuilt in Tailwind at the same
 * measurements; nothing here is a redesign.
 *
 * Below 768px none of that fits, so the nav, the operator's email and sign-out
 * move into a panel behind a burger. The wordmark and the burger are all that
 * stay on the bar.
 */

const NAV = [
  { to: '/console', label: 'Dashboard' },
  { to: '/console/households', label: 'Households' },
]

/** Uppercase plus wide tracking is a chrome treatment. It lives here and
 *  nowhere else — it must not appear in page content. */
const WORDMARK = 'text-sm font-semibold tracking-[0.16em] uppercase text-ink-inverse whitespace-nowrap'
const NAV_LINK =
  'text-xs font-semibold tracking-[0.12em] uppercase no-underline pb-1 ' +
  'border-b-2 transition-[color,border-color] duration-[120ms] ease-fast'

export function Header() {
  const location = useLocation()
  const { operator } = useAuth()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  // The pathname the menu was opened on, rather than a boolean plus an effect
  // that closes it on navigation. Derived state cannot get out of step, and
  // there is no render where a menu left over from the previous page is open.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null)
  const isMenuOpen = menuOpenedAt === location.pathname
  const menuId = useId()
  const burgerRef = useRef<HTMLButtonElement>(null)
  const { mutate: logout, isPending: isLoggingOut } = useLogout()

  const isActive = (path: string) => location.pathname === path

  // Escape closes it and hands focus back to the button that opened it —
  // otherwise a keyboard operator is left standing in a panel that is gone.
  useEffect(() => {
    if (!isMenuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpenedAt(null)
      burgerRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen])

  const signOutButton = (
    <button
      type="button"
      onClick={() => setIsLogoutModalOpen(true)}
      className={cn(
        'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-3',
        'border border-on-navy-border bg-transparent text-ink-inverse',
        'text-xs font-semibold tracking-[0.1em] uppercase',
        'transition-[background-color,border-color] duration-[120ms] ease-fast',
        'hover:bg-on-navy-fill hover:border-on-navy-border-strong',
        'focus-visible:outline-focus-on-navy',
      )}
    >
      <SignOutMark />
      <span>Sign Out</span>
    </button>
  )

  return (
    <>
      <header className="bg-navy text-ink-inverse border-b border-navy-edge">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-8 px-4 py-3 md:px-6 md:py-4">
          <p className={WORDMARK}>Nostos Operator Console</p>

          <nav className="mr-auto hidden items-center gap-6 md:flex" aria-label="Console sections">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                className={cn(
                  NAV_LINK,
                  isActive(item.to)
                    ? 'text-ink-inverse border-b-ink-inverse'
                    : 'text-on-navy-dim border-b-transparent hover:text-ink-inverse hover:border-b-on-navy-border-soft',
                  'focus-visible:outline-focus-on-navy',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden min-w-0 items-center gap-4 md:flex">
            {operator?.email && (
              <span
                className="max-w-[24ch] truncate text-sm text-on-navy-muted"
                title={operator.email}
              >
                {operator.email}
              </span>
            )}
            {signOutButton}
          </div>

          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMenuOpenedAt(isMenuOpen ? null : location.pathname)}
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            className={cn(
              'ml-auto inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center md:hidden',
              'rounded-md border border-on-navy-border bg-transparent text-ink-inverse',
              'transition-[background-color,border-color] duration-[120ms] ease-fast',
              'hover:bg-on-navy-fill focus-visible:outline-focus-on-navy',
            )}
          >
            {isMenuOpen ? <CloseMark /> : <MenuMark />}
          </button>
        </div>

        {/* The panel stays on the navy field so the bar reads as one object that
            grew, rather than a second surface dropping over the page. */}
        <div
          id={menuId}
          hidden={!isMenuOpen}
          className="border-t border-on-navy-border/40 md:hidden"
        >
          <nav className="flex flex-col px-4 py-2" aria-label="Console sections">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-2 py-3 no-underline',
                  'text-xs font-semibold tracking-[0.12em] uppercase',
                  'focus-visible:outline-focus-on-navy',
                  isActive(item.to)
                    ? 'text-ink-inverse bg-on-navy-fill'
                    : 'text-on-navy-dim hover:text-ink-inverse',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-on-navy-border/40 px-4 py-3">
            {operator?.email && (
              <span className="min-w-0 truncate text-sm text-on-navy-muted" title={operator.email}>
                {operator.email}
              </span>
            )}
            {signOutButton}
          </div>
        </div>
      </header>

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        isLoading={isLoggingOut}
        onConfirm={() => logout()}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </>
  )
}
