import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { ArrowDownMark, ArrowUpMark } from '@/components/icons'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'
import { formatEntryDate, graceRemaining } from '../grace'
import type { HouseholdSortField, HouseholdSummary } from '../types'

export interface HouseholdTableProps {
  households: HouseholdSummary[]
  isLoading: boolean
  onRowClick: (id: string) => void
  search?: string
  /** Present when the list is sortable — the page owns the sort state. */
  sortBy?: HouseholdSortField
  sortOrder?: 'ASC' | 'DESC'
  onSort?: (field: HouseholdSortField) => void
  /** Rendered in the empty state when a filter is what emptied it. */
  onClearFilters?: () => void
  hasFilters?: boolean
}

interface Column {
  field: HouseholdSortField | null
  label: string
  className: string
}

const COLUMNS: Column[] = [
  { field: 'name', label: 'Name', className: 'w-[26%]' },
  { field: 'adminName', label: 'Admin', className: 'w-[28%]' },
  { field: 'memberCount', label: 'Members', className: 'w-24 text-right' },
  { field: 'createdAt', label: 'Created', className: 'w-[120px]' },
  // 240px, not 200: at 200 the grace line wrapped to "29 days / left".
  { field: null, label: 'Status', className: 'w-[240px]' },
]

/**
 * The rows scroll inside the card rather than down the page.
 *
 * This is what makes `position: sticky` on the head actually work. A wrapper
 * with `overflow-x: auto` computes `overflow-y: auto` as well, which turns it
 * into a scroll container the head would stick to — and since that container
 * had no height limit, it never scrolled and the head never stuck. Capping the
 * height fixes the sticky head and pins the toolbar and the pagination in view
 * at the same time, which is the whole point at 200+ households.
 */
const SCROLL_AREA = 'max-h-[calc(100svh-320px)] min-h-[360px] overflow-auto'

/**
 * What the grace period says about a household, as one short phrase plus the
 * tone it earns.
 *
 * A lapsed grace period is not a louder version of a running one — it is the
 * other condition entirely: the deletion can no longer be undone from here.
 * Amber for "you still have time", red for "you do not".
 */
function graceNote(
  deletionScheduledFor: string | null,
): { label: string; lapsed: boolean } | null {
  const grace = graceRemaining(deletionScheduledFor)
  if (!grace || !deletionScheduledFor) return null
  if (grace.lapsed) return { label: 'Grace period ended', lapsed: true }
  return {
    label: `Deletes ${formatEntryDate(deletionScheduledFor)} · ${grace.daysRemaining} ${
      grace.daysRemaining === 1 ? 'day' : 'days'
    } left`,
    lapsed: false,
  }
}

function StatusCell({ household }: { household: HouseholdSummary }) {
  if (household.status !== 'DELETION_PENDING') {
    return <Badge tone="neutral">Active</Badge>
  }

  const note = graceNote(household.deletionScheduledFor)

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge tone={note?.lapsed ? 'danger' : 'warning'}>Deletion Pending</Badge>
      {note && (
        <span className={cn('text-sm', note.lapsed ? 'text-danger' : 'text-warning')}>
          {note.label}
        </span>
      )}
    </div>
  )
}

function EmptyState({
  search,
  hasFilters,
  onClearFilters,
}: Pick<HouseholdTableProps, 'search' | 'hasFilters' | 'onClearFilters'>) {
  if (hasFilters) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="mx-auto text-ink-2">
          {search
            ? `No households match “${search}”. Check the spelling, or search by admin email.`
            : 'No households match the current filter.'}
        </p>
        {onClearFilters && (
          <Button className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="px-6 py-12 text-center">
      <p className="mx-auto text-ink-2">No households yet. Create one to get started.</p>
    </div>
  )
}

/** Sorted column: an arrow in the real direction. Unsorted: nothing, so the
 *  one arrow on screen always means something. */
function SortIndicator({ order }: { order: 'ASC' | 'DESC' }) {
  return (
    <span className="text-ink-3">{order === 'ASC' ? <ArrowUpMark /> : <ArrowDownMark />}</span>
  )
}

function HeadCell({
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: Column
  sortBy?: HouseholdSortField
  sortOrder?: 'ASC' | 'DESC'
  onSort?: (field: HouseholdSortField) => void
}) {
  const isSorted = Boolean(column.field && sortBy === column.field)
  const sortable = Boolean(column.field && onSort)

  return (
    <th
      scope="col"
      aria-sort={
        !sortable ? undefined : isSorted ? (sortOrder === 'ASC' ? 'ascending' : 'descending') : 'none'
      }
      className={cn(
        'border-b border-line bg-surface-2 px-4 py-3 text-left align-middle md:px-5',
        'text-xs font-semibold whitespace-nowrap text-ink-2',
        column.className,
      )}
    >
      {sortable && column.field ? (
        <button
          type="button"
          onClick={() => onSort?.(column.field as HouseholdSortField)}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-transparent p-0',
            'text-xs font-semibold text-inherit transition-colors duration-[120ms] ease-fast',
            'hover:text-ink',
            column.className.includes('text-right') && 'flex-row-reverse',
          )}
        >
          {column.label}
          {isSorted && sortOrder && <SortIndicator order={sortOrder} />}
        </button>
      ) : (
        column.label
      )}
    </th>
  )
}

function DesktopTable({
  households,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
}: Required<Pick<HouseholdTableProps, 'households' | 'onRowClick'>> &
  Pick<HouseholdTableProps, 'sortBy' | 'sortOrder' | 'onSort'>) {
  return (
    <div className={SCROLL_AREA}>
      <table className="w-full min-w-[760px] border-collapse text-md">
        <thead className="sticky top-0 z-10">
          <tr>
            {COLUMNS.map((column) => (
              <HeadCell
                key={column.label}
                column={column}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {households.map((household) => (
            <tr
              key={household.id}
              onClick={() => onRowClick(household.id)}
              className="cursor-pointer transition-colors duration-[120ms] ease-fast hover:bg-surface-2"
            >
              <td className="border-b border-line px-4 py-4 align-middle md:px-5">
                {/* A real button, so the row is reachable and openable by
                    keyboard — a click handler on the <tr> alone is not. */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRowClick(household.id)
                  }}
                  className="cursor-pointer rounded-sm bg-transparent p-0 text-left text-md font-medium text-navy hover:underline hover:underline-offset-2"
                >
                  {household.name}
                </button>
              </td>

              <td
                className="border-b border-line px-4 py-4 align-middle md:px-5"
                title={household.adminEmail ?? undefined}
              >
                {household.adminName || household.adminEmail ? (
                  <>
                    <span className="block text-ink">{household.adminName ?? '—'}</span>
                    <span className="mt-0.5 block max-w-[30ch] truncate text-sm text-ink-3">
                      {household.adminEmail ?? '—'}
                    </span>
                  </>
                ) : (
                  <span className="block text-sm text-ink-3">No admin</span>
                )}
              </td>

              <td className="border-b border-line px-4 py-4 text-right align-middle tabular-nums md:px-5">
                {household.memberCount}
              </td>

              <td className="border-b border-line px-4 py-4 align-middle text-ink-2 whitespace-nowrap tabular-nums md:px-5">
                {formatEntryDate(household.createdAt)}
              </td>

              <td className="border-b border-line px-4 py-4 align-middle md:px-5">
                <StatusCell household={household} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Below 768px the register stops being a table. Five columns on a 390px screen
 * means swiping sideways to find out whether a household is being deleted,
 * which is the one thing the errand is about — so name and status share the
 * first line and nothing leaves the screen.
 */
function MobileList({
  households,
  onRowClick,
}: Required<Pick<HouseholdTableProps, 'households' | 'onRowClick'>>) {
  return (
    <ul>
      {households.map((household) => {
        const isPending = household.status === 'DELETION_PENDING'
        const note = isPending ? graceNote(household.deletionScheduledFor) : null

        return (
          <li key={household.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => onRowClick(household.id)}
              className="flex w-full cursor-pointer flex-col items-stretch gap-1 bg-transparent px-4 py-4 text-left active:bg-surface-2"
            >
              <span className="flex items-start justify-between gap-3">
                {/* A card title, at the ramp's card-title step: 16px / 600. */}
                <span className="min-w-0 text-lg font-semibold tracking-[-0.011em] text-ink">
                  {household.name}
                </span>
                {isPending ? (
                  <Badge tone={note?.lapsed ? 'danger' : 'warning'}>Deletion Pending</Badge>
                ) : (
                  <Badge tone="neutral">Active</Badge>
                )}
              </span>

              <span className="block truncate text-sm text-ink-2">
                {household.adminEmail ?? household.adminName ?? 'No admin'}
              </span>

              <span
                className={cn(
                  'block text-xs tabular-nums',
                  note ? (note.lapsed ? 'text-danger' : 'text-warning') : 'text-ink-3',
                )}
              >
                {note?.label ??
                  `${household.memberCount} ${
                    household.memberCount === 1 ? 'member' : 'members'
                  } · created ${formatEntryDate(household.createdAt)}`}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function HouseholdTable({
  households,
  isLoading,
  onRowClick,
  search,
  sortBy,
  sortOrder,
  onSort,
  onClearFilters,
  hasFilters,
}: HouseholdTableProps) {
  const isDesktop = useIsDesktop()

  if (isLoading) {
    return (
      <div className="px-6 py-12 text-center">
        <p role="status">Loading households…</p>
      </div>
    )
  }

  if (households.length === 0) {
    return (
      <EmptyState
        search={search}
        hasFilters={hasFilters ?? Boolean(search)}
        onClearFilters={onClearFilters}
      />
    )
  }

  return isDesktop ? (
    <DesktopTable
      households={households}
      onRowClick={onRowClick}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  ) : (
    <MobileList households={households} onRowClick={onRowClick} />
  )
}
