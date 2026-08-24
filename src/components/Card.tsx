import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * The console's one container: white surface, real 1px border, 8px radius,
 * resting shadow. Depth comes from the border first — a shadow never replaces
 * one — and cards are never nested.
 */

export function Card({
  children,
  className,
  as: Element = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div'
  'aria-label'?: string
}) {
  return (
    <Element
      className={cn(
        'bg-surface border border-line rounded-lg shadow-rest overflow-hidden',
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 md:px-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('px-4 py-5 md:px-5', className)}>{children}</div>
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-4 py-3 md:px-5',
        className,
      )}
    >
      {children}
    </div>
  )
}
