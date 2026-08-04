import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricsGrid } from '../MetricsGrid'

describe('MetricsGrid', () => {
  it('renders every metric with its label', () => {
    render(
      <MetricsGrid
        metrics={{
          households: 42,
          members: 234,
          newThisWeek: 5,
          pendingDeletion: 2,
          active7d: 189,
          failedSignins: 3,
          failedEmails: 0,
        }}
      />,
    )

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Households')).toBeInTheDocument()
    expect(screen.getByText('234')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('189')).toBeInTheDocument()
    expect(screen.getByText('Active (7d)')).toBeInTheDocument()
  })
})
