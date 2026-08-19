import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'warning' | 'danger'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: BadgeTone
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}
