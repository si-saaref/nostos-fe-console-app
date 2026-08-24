import { cn } from '@/utils/cn'
import { ChevronLeftMark, ChevronRightMark } from './icons'

/**
 * Numbered pagination. At 200+ households the operator needs to know how much
 * register there is and to jump within it — prev/next alone makes page 4 a
 * four-click journey with no sense of where it ends.
 */

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

const GAP = 'gap' as const

/**
 * First page, last page, and a window around the current one, with a gap mark
 * where numbers were skipped. Always the same width, so the control does not
 * jitter as the operator walks through pages.
 */
function pageItems(page: number, totalPages: number): Array<number | typeof GAP> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const window = [page - 1, page, page + 1].filter((n) => n > 1 && n < totalPages)
  const items: Array<number | typeof GAP> = [1]

  // Pin the window to the ends so the control keeps a constant width instead of
  // shrinking on the first and last pages.
  if (page <= 3) window.push(2, 3, 4, 5)
  if (page >= totalPages - 2) {
    window.unshift(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1)
  }

  const middle = [...new Set(window)].filter((n) => n > 1 && n < totalPages).sort((a, b) => a - b)

  if (middle[0] > 2) items.push(GAP)
  items.push(...middle)
  if (middle[middle.length - 1] < totalPages - 1) items.push(GAP)
  items.push(totalPages)

  return items
}

const STEP =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 ' +
  'text-sm font-medium tabular-nums cursor-pointer ' +
  'transition-[background-color,border-color,color] duration-[120ms] ease-fast ' +
  'disabled:cursor-not-allowed disabled:text-ink-3 disabled:bg-surface-2 disabled:border-line'

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const items = pageItems(page, totalPages)

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(STEP, 'bg-surface text-ink border-line-strong not-disabled:hover:bg-surface-2')}
      >
        <ChevronLeftMark />
      </button>

      {items.map((item, index) =>
        item === GAP ? (
          <span
            // Two gaps can coexist, one on each side, so the index is the identity.
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-sm text-ink-3 select-none"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              STEP,
              item === page
                ? 'bg-navy text-ink-inverse border-navy'
                : 'bg-surface text-ink-2 border-line-strong hover:bg-surface-2 hover:text-ink',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(STEP, 'bg-surface text-ink border-line-strong not-disabled:hover:bg-surface-2')}
      >
        <ChevronRightMark />
      </button>
    </nav>
  )
}
