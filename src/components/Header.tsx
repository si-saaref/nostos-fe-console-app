import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLogout } from '@/api/mutations/useLogout'
import { LogoutConfirmationModal } from './LogoutConfirmationModal'
import './header.css'

export function Header() {
  const location = useLocation()
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
      <header className="console-header">
        <div className="console-header-content">
          <div className="console-header-logo">
            <h1 className="console-logo-text">Nostos Operator Console</h1>
          </div>

          <nav className="console-nav">
            <Link
              to="/console/dashboard"
              className={`console-nav-link ${isActive('/console/dashboard') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              to="/console/households"
              className={`console-nav-link ${isActive('/console/households') ? 'active' : ''}`}
            >
              Households
            </Link>
          </nav>

          <div className="console-header-actions">
            <button
              type="button"
              className="console-logout-button"
              onClick={handleLogoutClick}
              aria-label="Sign out"
              title="Sign out"
            >
              <span className="console-logout-icon">→</span>
              <span className="console-logout-text">Sign Out</span>
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
