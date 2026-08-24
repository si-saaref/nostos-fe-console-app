import { cn } from '@/utils/cn'
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

/** The tint's whole job is that success, error and info can never be mistaken
 *  for each other. Icon, fill and edge all carry it — never position alone,
 *  never colour alone. */
const TONES: Record<ToastType, { panel: string; icon: string }> = {
  success: { panel: 'bg-success-bg border-success-line', icon: 'text-success' },
  error: { panel: 'bg-danger-bg border-danger-line', icon: 'text-danger' },
  info: { panel: 'bg-info-bg border-info-line', icon: 'text-info' },
}

export function Toast({ toast }: { toast: ToastItem }) {
  const Icon = ICONS[toast.type]
  const tone = TONES[toast.type]

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        'text-md leading-[1.45] text-ink shadow-overlay animate-toast-in',
        tone.panel,
      )}
    >
      <span className={cn('mt-px flex shrink-0', tone.icon)}>
        <Icon />
      </span>
      <span className="min-w-0">{toast.message}</span>
    </div>
  )
}
