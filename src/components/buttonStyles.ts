import { cn } from '@/utils/cn'

/**
 * The button system's raw class strings, and the helper that puts the same face
 * on a router `Link` — which cannot be a `<button>`.
 *
 * Split out of Button.tsx so that file exports only a component and can be hot
 * reloaded.
 */

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm' | 'icon'

export const BASE =
  'inline-flex items-center justify-center gap-2 font-sans text-md font-medium leading-none ' +
  'whitespace-nowrap rounded-md border cursor-pointer ' +
  'transition-[background-color,border-color,color] duration-[120ms] ease-fast ' +
  'disabled:cursor-not-allowed disabled:shadow-none ' +
  'disabled:bg-surface-2 disabled:text-ink-3 disabled:border-line'

export const VARIANTS: Record<ButtonVariant, string> = {
  default:
    'bg-surface text-ink border-line-strong shadow-rest ' +
    'not-disabled:hover:bg-surface-2 not-disabled:hover:border-line-hover',
  primary:
    'bg-navy text-ink-inverse border-navy shadow-rest ' +
    'not-disabled:hover:bg-navy-hover not-disabled:hover:border-navy-hover',
  danger:
    'bg-danger text-ink-inverse border-danger shadow-rest ' +
    'not-disabled:hover:bg-danger-hover not-disabled:hover:border-danger-hover',
  ghost:
    'bg-transparent text-ink-2 border-transparent ' +
    'not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink ' +
    'disabled:bg-transparent disabled:border-transparent',
}

export const SIZES: Record<ButtonSize, string> = {
  md: 'h-9 px-4',
  sm: 'h-8 px-3 text-sm',
  icon: 'h-8 w-8 p-0',
}

export function buttonClasses(
  variant: ButtonVariant = 'default',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], 'no-underline', className)
}
