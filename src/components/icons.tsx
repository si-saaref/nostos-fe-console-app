/**
 * One 16-unit grid, one 1.5 stroke, currentColor.
 */

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function SignOutMark() {
  return (
    <svg {...base}>
      <path d="M6.25 2.5H3.25v11h3" />
      <path d="M9 5.25 11.75 8 9 10.75" />
      <path d="M11.75 8H6.5" />
    </svg>
  )
}

export function CloseMark() {
  return (
    <svg {...base}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export function SearchMark() {
  return (
    <svg {...base}>
      <circle cx="7.25" cy="7.25" r="4.25" />
      <path d="M10.5 10.5 13.5 13.5" />
    </svg>
  )
}

export function PlusMark() {
  return (
    <svg {...base}>
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </svg>
  )
}

export function CheckCircleMark() {
  return (
    <svg {...base}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.25 8.25 1.9 1.9 3.6-3.9" />
    </svg>
  )
}

export function AlertCircleMark() {
  return (
    <svg {...base}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 5v3.5" />
      <path d="M8 10.75h.01" />
    </svg>
  )
}

export function InfoCircleMark() {
  return (
    <svg {...base}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.5v3.5" />
      <path d="M8 5.25h.01" />
    </svg>
  )
}

export function ChevronDownMark() {
  return (
    <svg {...base}>
      <path d="M4 6.5 8 10.5l4-4" />
    </svg>
  )
}

export function ChevronLeftMark() {
  return (
    <svg {...base}>
      <path d="M9.5 4 5.5 8l4 4" />
    </svg>
  )
}

export function ChevronRightMark() {
  return (
    <svg {...base}>
      <path d="M6.5 4l4 4-4 4" />
    </svg>
  )
}

/** Sort direction. Rendered only on the column that is actually sorted. */
export function ArrowUpMark() {
  return (
    <svg {...base}>
      <path d="M8 12.5v-9" />
      <path d="M4.5 7 8 3.5 11.5 7" />
    </svg>
  )
}

export function ArrowDownMark() {
  return (
    <svg {...base}>
      <path d="M8 3.5v9" />
      <path d="M4.5 9 8 12.5 11.5 9" />
    </svg>
  )
}

export function MenuMark() {
  return (
    <svg {...base}>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  )
}

export function TrashMark() {
  return (
    <svg {...base}>
      <path d="M2.75 4.5h10.5" />
      <path d="M6.5 4.5V3.25h3V4.5" />
      <path d="M4 4.5l.6 8.25h6.8L12 4.5" />
      <path d="M6.75 7v3M9.25 7v3" />
    </svg>
  )
}

export function UndoMark() {
  return (
    <svg {...base}>
      <path d="M3 7.5V4" />
      <path d="M3 7.5h3.5" />
      <path d="M3.9 6.4A5 5 0 1 1 3.5 10.4" />
    </svg>
  )
}

export function MailMark() {
  return (
    <svg {...base}>
      <rect x="2.25" y="3.75" width="11.5" height="8.5" rx="1.25" />
      <path d="m2.75 4.75 5.25 3.9 5.25-3.9" />
    </svg>
  )
}

export function RefreshMark() {
  return (
    <svg {...base}>
      <path d="M13 8a5 5 0 1 1-1.6-3.65" />
      <path d="M13.25 2.75v3h-3" />
    </svg>
  )
}
