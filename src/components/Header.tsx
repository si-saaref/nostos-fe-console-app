import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLogout } from '@/api/mutations/useLogout'
import { useAuth } from '@/contexts/useAuth'
import { LogoutConfirmationModal } from './LogoutConfirmationModal'
import { SignOutMark } from './icons'
import './header.css'

export function Header() {
  const location = useLocation()
  const { operator } = useAuth()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const { mutate: logout, isPending: isLoggingOut } = useLogout()

  const isActive = (path: string) => location.pathname === path

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true)
  }

  const handleConfirmLogout = () => {
    logout()
  }

  const handleCancelLogout = () => {
    setIsLogoutModalOpen(false)
  }

  return (
    <>
      <header className="registry-head">
        <div className="registry-head-inner">
          <h1 className="registry-head-mark">Nostos Operator Console</h1>

          <nav className="registry-head-nav" aria-label="Console sections">
            <Link
              to="/console"
              className={`console-nav-link ${isActive('/console') ? 'active' : ''}`}
              aria-current={isActive('/console') ? 'page' : undefined}
            >
              Dashboard
            </Link>
            <Link
              to="/console/households"
              className={`console-nav-link ${isActive('/console/households') ? 'active' : ''}`}
              aria-current={isActive('/console/households') ? 'page' : undefined}
            >
              Households
            </Link>
          </nav>

          <div className="registry-head-operator">
            {operator?.email && (
              <span className="registry-head-email" title={operator.email}>
                {operator.email}
              </span>
            )}
            <button
              type="button"
              className="registry-head-signout"
              onClick={handleLogoutClick}
              aria-label="Sign out"
            >
              <SignOutMark />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        isLoading={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  )
}
