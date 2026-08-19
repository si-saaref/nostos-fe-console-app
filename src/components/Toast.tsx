import { AlertCircleMark, CheckCircleMark, InfoCircleMark } from './icons'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

const ICONS = {
  success: CheckCircleMark,
  error: AlertCircleMark,
  info: InfoCircleMark,
}

/** Success, error and info are told apart by icon, fill and border — never by
 *  position alone, and never by colour alone. */
export function Toast({ toast }: { toast: ToastItem }) {
  const Icon = ICONS[toast.type]

  return (
    <div role="alert" className={`toast toast--${toast.type}`}>
      <span className="toast-icon">
        <Icon />
      </span>
      <span className="toast-message">{toast.message}</span>
    </div>
  )
}
