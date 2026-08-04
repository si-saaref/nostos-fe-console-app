import './logout-modal.css'

export interface LogoutConfirmationModalProps {
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutConfirmationModal({
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: LogoutConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="logout-modal-overlay" onClick={onCancel}>
      <div className="logout-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-header">
          <h2>Sign out?</h2>
          <button
            type="button"
            className="logout-modal-close"
            onClick={onCancel}
            aria-label="Close"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="logout-modal-body">
          <p>You'll be signed out of the Nostos Operator Console.</p>
          <p className="logout-modal-subtext">You can sign back in anytime with your email.</p>
        </div>

        <div className="logout-modal-footer">
          <button
            type="button"
            className="logout-modal-button logout-modal-button-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="logout-modal-button logout-modal-button-primary"
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
