import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Toast, type ToastItem, type ToastType } from './Toast'
import { ToastContext, type ToastContextValue } from './toastContext'

const TOAST_DURATION_MS = 3000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idCounter = useRef(0)

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (type: ToastType, message: string) => {
      idCounter.current += 1
      const id = `toast-${idCounter.current}`
      setToasts((current) => [...current, { id, type, message }])
      setTimeout(() => remove(id), TOAST_DURATION_MS)
    },
    [remove],
  )

  const success = useCallback((message: string) => show('success', message), [show])
  const error = useCallback((message: string) => show('error', message), [show])
  const info = useCallback((message: string) => show('info', message), [show])

  const value = useMemo<ToastContextValue>(
    () => ({ success, error, info }),
    [success, error, info],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Above the dialog layer: an operator who just acted inside a modal has
          to see the result of it. On a phone it clears the home indicator. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-60
                   flex w-[min(400px,calc(100vw-32px))] flex-col gap-3 md:right-6 md:bottom-6"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
