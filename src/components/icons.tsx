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
