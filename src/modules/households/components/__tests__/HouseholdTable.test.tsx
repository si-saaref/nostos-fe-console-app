import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HouseholdTable } from '../HouseholdTable'
import type { HouseholdSummary } from '../../types'

const households: HouseholdSummary[] = [
  {
    id: '1',
    name: 'Adios Family',
    adminName: 'Javier',
    adminEmail: 'javier@adios.com',
    createdAt: '2026-07-15T00:00:00.000Z',
    deletionScheduledFor: null,
    memberCount: 4,
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Smith Household',
    adminName: 'John',
    adminEmail: 'john@smith.com',
    createdAt: '2026-07-10T00:00:00.000Z',
    deletionScheduledFor: '2026-08-09T00:00:00.000Z',
    memberCount: 3,
    status: 'DELETION_PENDING',
  },
]

describe('HouseholdTable', () => {
  it('renders a row per household with a deletion-pending badge where relevant', () => {
    render(<HouseholdTable households={households} isLoading={false} onRowClick={vi.fn()} />)

    expect(screen.getByText('Adios Family')).toBeInTheDocument()
    expect(screen.getByText('Smith Household')).toBeInTheDocument()
    expect(screen.getByText('Deletion Pending')).toBeInTheDocument()
  })

  it('calls onRowClick with the household id when a row is clicked', async () => {
    const onRowClick = vi.fn()
    const user = userEvent.setup()
    render(<HouseholdTable households={households} isLoading={false} onRowClick={onRowClick} />)

    await user.click(screen.getByText('Adios Family'))
    expect(onRowClick).toHaveBeenCalledWith('1')
  })

  it('shows an empty state when there are no households', () => {
    render(<HouseholdTable households={[]} isLoading={false} onRowClick={vi.fn()} />)
    expect(screen.getByText(/no households yet/i)).toBeInTheDocument()
  })

  it('renders a placeholder when the household has no admin', () => {
    render(
      <HouseholdTable
        households={[
          {
            id: 'h2',
            name: 'Orphan Household',
            status: 'ACTIVE',
            createdAt: '2026-07-15T00:00:00.000Z',
            deletionScheduledFor: null,
            adminName: null,
            adminEmail: null,
            memberCount: 0,
          },
        ]}
        isLoading={false}
        onRowClick={vi.fn()}
      />,
    )

    expect(screen.getByText('No admin')).toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })
})
