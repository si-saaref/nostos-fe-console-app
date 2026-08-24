import type { ReactNode } from 'react'
import { AlertDialog, Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/utils/cn'
import { Button } from './Button'
import { CloseMark } from './icons'

/**
 * One dialog, two presentations.
 *
 * At 768px and up it is a centred modal — what an operator at a desk expects,
 * and what keeps the register visible around it. Below 768px it anchors to the
 * bottom edge as a sheet: a centred box on a phone wastes the safe area and
 * pushes the primary action to the middle of the screen, away from the thumb
 * that has to press it.
 *
 * Radix owns the parts that are easy to get wrong and invisible when you do:
 * the focus trap, Escape, focus restoration to whatever opened it, scroll lock,
 * and marking the rest of the page inert.
 */

export type DialogSize = 'sm' | 'md' | 'lg'

const MAX_WIDTH: Record<DialogSize, string> = {
  sm: 'md:max-w-[440px]',
  md: 'md:max-w-[480px]',
  lg: 'md:max-w-[560px]',
}

const OVERLAY =
  'fixed inset-0 z-40 bg-overlay ' +
  'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out'

/* Mobile: welded to the bottom edge, rounded on the top corners only, so the
 * sheet reads as coming up from off-screen rather than floating.
 * Desktop: centred, rounded all round, lifted by the overlay shadow. */
const PANEL =
  'fixed z-40 flex flex-col bg-surface border border-line shadow-overlay ' +
  'inset-x-0 bottom-0 max-h-[88svh] rounded-t-lg ' +
  'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out ' +
  'md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:w-[calc(100vw-48px)] ' +
  'md:max-h-[min(85svh,720px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg ' +
  'md:data-[state=open]:animate-modal-in md:data-[state=closed]:animate-modal-out'

/** The one-handed grab affordance. Purely a signal — Radix handles dismissal. */
function SheetHandle() {
  return (
    <div className="flex justify-center pt-3 md:hidden" aria-hidden="true">
      <span className="h-1 w-9 rounded-full bg-line-strong" />
    </div>
  )
}

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Read out with the title. Omit when the body already explains itself. */
  description?: string
  size?: DialogSize
  /** Sits to the right of the title — a status badge, usually. */
  titleAside?: ReactNode
  /** Pinned below the scrolling body. */
  footer?: ReactNode
  /** While true, Escape and click-outside will not close it. */
  busy?: boolean
  children: ReactNode
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  titleAside,
  footer,
  busy = false,
  children,
}: DialogProps) {
  const blockIfBusy = (event: Event | KeyboardEvent) => {
    if (busy) event.preventDefault()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content
          className={cn(PANEL, MAX_WIDTH[size])}
          onEscapeKeyDown={blockIfBusy}
          onInteractOutside={blockIfBusy}
          /* With a Description present Radix wires this up from context, so the
           * prop must stay absent. Without one it warns; an explicit undefined
           * is the documented way to say "there is deliberately no description". */
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <SheetHandle />

          <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 pb-4 md:px-6 md:pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-lg">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-ink-2">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {titleAside}
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close" disabled={busy}>
                  <CloseMark />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="grow overflow-y-auto border-t border-line px-5 py-5 md:px-6">
            {children}
          </div>

          {footer && (
            <div
              className={cn(
                'flex shrink-0 flex-wrap items-center justify-end gap-3',
                'border-t border-line bg-surface-2 px-5 py-3 md:px-6',
                'md:rounded-b-lg',
                /* Clear the home indicator on a phone. */
                'pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3',
              )}
            >
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** What is about to happen, when, and how to undo it. */
  description: ReactNode
  confirmLabel: string
  busyLabel: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  /** Rendered above the actions — the failed attempt's message, usually. */
  error?: ReactNode
  onConfirm: () => void
}

/**
 * The same presentation as `Dialog`, on `role="alertdialog"`: there is a
 * decision to make and no close affordance other than the two answers.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  const blockIfBusy = (event: Event | KeyboardEvent) => {
    if (busy) event.preventDefault()
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={OVERLAY} />
        <AlertDialog.Content
          className={cn(PANEL, MAX_WIDTH.sm)}
          onEscapeKeyDown={blockIfBusy}
        >
          <SheetHandle />

          <div className="grow overflow-y-auto px-5 pt-4 pb-5 md:px-6 md:pt-6">
            <AlertDialog.Title className="text-lg">{title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-md text-ink-2">
              {description}
            </AlertDialog.Description>
            {error && <div className="mt-4">{error}</div>}
          </div>

          <div
            className={cn(
              'flex shrink-0 items-center justify-end gap-3',
              'border-t border-line bg-surface-2 px-5 py-3 md:rounded-b-lg md:px-6',
              'pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3',
            )}
          >
            <AlertDialog.Cancel asChild>
              <Button disabled={busy}>{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <Button
              variant={tone}
              onClick={onConfirm}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? busyLabel : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
