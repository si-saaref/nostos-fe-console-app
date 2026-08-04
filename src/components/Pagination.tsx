export interface PaginationProps {
  page: number
  totalPages: number
  onPreviousPage: () => void
  onNextPage: () => void
}

export function Pagination({ page, totalPages, onPreviousPage, onNextPage }: PaginationProps) {
  return (
    <nav aria-label="Pagination">
      <button type="button" onClick={onPreviousPage} disabled={page <= 1}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" onClick={onNextPage} disabled={page >= totalPages}>
        Next
      </button>
    </nav>
  )
}
