import { ConfirmDialog } from './Dialog'

export interface LogoutConfirmationModalProps {
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Now an `alertdialog` on the shared confirm presentation, which is what it
 * always was in substance: two answers, no third way out. The hand-rolled
 * version had Escape but no focus trap and no focus restoration; Radix brings
 * both, so those two items come off the open list in docs/FRONTEND.md §13.
 */
export function LogoutConfirmationModal({
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: LogoutConfirmationModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title="Sign out?"
      description={
        <>
          You&apos;ll be signed out of the Nostos Operator Console.
          <span className="mt-2 block text-sm text-ink-3">
            You can sign back in anytime with your email.
          </span>
        </>
      }
      confirmLabel="Sign Out"
      busyLabel="Signing out..."
      busy={isLoading}
      onConfirm={onConfirm}
    />
  )
}
