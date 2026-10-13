import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import {
  BASE,
  SIZES,
  VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles'

/**
 * The four button tones DESIGN.md defines, plus the sizes the console actually
 * uses. 36px tall, 6px radius, 14px/500, resting shadow, 8px icon gap.
 *
 * `primary` is explicit here rather than inferred from `type="submit"`. The old
 * stylesheet styled every submit button navy, which meant a form's secondary
 * action had to fight the selector to look secondary.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  )
})
