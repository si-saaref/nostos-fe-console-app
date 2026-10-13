import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { AlertCircleMark, InfoCircleMark } from './icons'

const TONES = {
  info: { panel: 'bg-info-bg border-info-line', icon: 'text-info', Icon: InfoCircleMark },
  warning: {
    panel: 'bg-warning-bg border-warning-line',
    icon: 'text-warning',
    Icon: AlertCircleMark,
  },
  danger: { panel: 'bg-danger-bg border-danger-line', icon: 'text-danger', Icon: AlertCircleMark },
}

export type NoticeTone = keyof typeof TONES

/** A standing statement about the whole page, not a transient one — a toast is
 *  what disappears. Sits above the content it qualifies. */
export function Notice({
  children,
  tone = 'info',
  role = 'status',
  className,
}: {
  children: ReactNode
  tone?: NoticeTone
  role?: 'status' | 'alert'
  className?: string
}) {
  const { panel, icon, Icon } = TONES[tone]

  return (
    <div
      role={role}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3', panel, className)}
    >
      <span className={cn('mt-0.5 flex shrink-0', icon)}>
        <Icon />
      </span>
      <div className="min-w-0 text-md text-ink">{children}</div>
    </div>
  )
}
