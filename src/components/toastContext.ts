import { createContext, useContext } from 'react'

export interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

/**
 * Split out of ToastProvider.tsx so that file exports only a component. A
 * module that exports both a component and a hook cannot be hot-reloaded, and
 * the provider sits at the root of the tree — every edit was reloading the
 * whole app.
 */
export const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
