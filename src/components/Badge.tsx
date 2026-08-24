import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * A status pill. The dot is `currentColor`, so foreground, fill and edge always
 * come from the same status triple — a badge cannot end up green-on-amber.
 *
 * `neutral` is the shipped name for the success pair; it is what "Active" uses.
 */
export type BadgeTone = 'neutral' | 'warning' | 'danger' | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'text-success bg-success-bg border-success-line',
  warning: 'text-warning bg-warning-bg border-warning-line',
  danger: 'text-danger bg-danger-bg border-danger-line',
  info: 'text-info bg-info-bg border-info-line',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-xs font-medium leading-none whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}
