import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * Label-and-value pairs inside a dialog. A real `<dl>`, so the pairing is
 * structural rather than a visual coincidence.
 *
 * The label column is fixed at 128px on a pointer and stacks below 768px: at
 * 390px wide, a 254-character email needs the whole line.
 */
export function Facts({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('flex flex-col gap-3', className)}>{children}</dl>
}

export function Fact({
  label,
  children,
  tone,
}: {
  label: string
  children: ReactNode
  tone?: 'warning' | 'danger'
}) {
  return (
    <div className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-4">
      <dt className="shrink-0 text-sm text-ink-3 md:w-32">{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-md break-words',
          tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-ink',
        )}
      >
        {children}
      </dd>
    </div>
  )
}

/** A titled band within the dialog body, ruled off from the one above it. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={title}
      className={cn('border-t border-line pt-5 first:border-t-0 first:pt-0', className)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
