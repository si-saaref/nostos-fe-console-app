export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

export function Toast({ toast }: { toast: ToastItem }) {
  return (
    <div role="alert" className={`toast toast--${toast.type}`}>
      {toast.message}
    </div>
  )
}
