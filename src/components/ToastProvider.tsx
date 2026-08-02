import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Toast, type ToastItem, type ToastType } from './Toast'

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

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

  const value: ToastContextValue = {
    success: (message) => show('success', message),
    error: (message) => show('error', message),
    info: (message) => show('info', message),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
