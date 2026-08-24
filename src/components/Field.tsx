import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { ChevronDownMark } from './icons'

/**
 * Inputs and their labelling. The red invalid state is not set here — it comes
 * from the `aria-invalid` / `aria-describedby$="-error"` rules in index.css, so
 * an input cannot look invalid without being announced as invalid.
 */

export const CONTROL =
  'w-full font-sans text-md text-ink bg-surface border border-line-strong rounded-md ' +
  'shadow-rest appearance-none transition-[border-color,box-shadow] duration-[120ms] ease-fast ' +
  'not-disabled:hover:border-line-hover ' +
  'focus:outline-none focus:border-focus focus:shadow-[0_0_0_3px_var(--focus-ring)] ' +
  'focus-visible:outline-none ' +
  'disabled:bg-surface-2 disabled:text-ink-3 disabled:cursor-not-allowed'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'px-3 py-[9px]', className)} {...props} />
  },
)

/**
 * A native `<select>`, on purpose. It is keyboard-operable for free, and on a
 * phone it opens the OS picker — which beats any listbox we could draw. The
 * chevron is ours because `appearance: none` removes the platform one.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative inline-flex items-center">
        <select
          ref={ref}
          className={cn(CONTROL, 'h-9 cursor-pointer py-0 pr-8 pl-3', className)}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-2.5 flex text-ink-3">
          <ChevronDownMark />
        </span>
      </div>
    )
  },
)

export interface FieldProps {
  /** Must match the control's `id`. */
  htmlFor: string
  label: string
  /** Renders the asterisk and is passed to the control as `aria-required`. */
  required?: boolean
  /** Shown under the control while there is no error. */
  hint?: ReactNode
  /** The message for `id={htmlFor}-error`; presence switches the control red. */
  error?: string
  children: ReactNode
  className?: string
}

export function Field({
  htmlFor,
  label,
  required,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error ? (
        <span id={`${htmlFor}-error`} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${htmlFor}-hint`} className="text-sm text-ink-3">
            {hint}
          </span>
        )
      )}
    </div>
  )
}
