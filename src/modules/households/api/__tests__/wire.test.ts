import { describe, expect, it } from 'vitest'
import {
  toCreateHouseholdBody,
  toCreatedHousehold,
  toHouseholdDeletion,
  toHouseholdDetail,
  toHouseholdRestore,
  toHouseholdSummary,
  toListQuery,
  toPagination,
  toResendInvite,
} from '../wire'

describe('toListQuery', () => {
  it('translates domain filters into snake_case query params', () => {
    expect(
      toListQuery({ page: 2, search: 'Adios', sortBy: 'memberCount', sortOrder: 'ASC' }),
    ).toEqual({ page: 2, search: 'Adios', sort_by: 'member_count', sort_order: 'ASC' })
  })

  it('omits an empty search rather than sending a blank param', () => {
    const query = toListQuery({ page: 1, search: '', sortBy: 'createdAt', sortOrder: 'DESC' })
    expect(query).toEqual({ page: 1, sort_by: 'created_at', sort_order: 'DESC' })
    expect('search' in query).toBe(false)
  })
})

describe('toHouseholdSummary', () => {
  it('maps a list item to camelCase', () => {
    expect(
      toHouseholdSummary({
        id: 'h1',
        name: 'Adios Family',
        status: 'ACTIVE',
        created_at: '2026-07-15T00:00:00.000Z',
        deletion_scheduled_for: null,
        admin_name: 'Javier',
        admin_email: 'javier@adios.com',
        member_count: 4,
      }),
    ).toEqual({
      id: 'h1',
      name: 'Adios Family',
      status: 'ACTIVE',
      createdAt: '2026-07-15T00:00:00.000Z',
      deletionScheduledFor: null,
      adminName: 'Javier',
      adminEmail: 'javier@adios.com',
      memberCount: 4,
    })
  })

  it('keeps a missing admin as null rather than inventing a name', () => {
    const summary = toHouseholdSummary({
      id: 'h2',
      name: 'Orphan',
      status: 'ACTIVE',
      created_at: '2026-07-15T00:00:00.000Z',
      deletion_scheduled_for: null,
      admin_name: null,
      admin_email: null,
      member_count: 0,
    })

    expect(summary.adminName).toBeNull()
    expect(summary.adminEmail).toBeNull()
  })
})

describe('toPagination', () => {
  it('maps total_pages to totalPages', () => {
    expect(toPagination({ page: 2, limit: 50, total: 137, total_pages: 3 })).toEqual({
      page: 2,
      limit: 50,
      total: 137,
      totalPages: 3,
    })
  })
})

describe('toHouseholdDetail', () => {
  const wire = {
    household: {
      id: 'h1',
      name: 'Adios Family',
      status: 'ACTIVE' as const,
      created_at: '2026-07-15T00:00:00.000Z',
      deletion_requested_at: null,
      scheduled_deletion_date: null,
    },
    admin: {
      id: 'a1',
      name: 'Javier',
      email: 'javier@adios.com',
      claim_status: 'PENDING_INVITE' as const,
      invite_sent_at: '2026-07-15T00:00:00.000Z',
      invite_expires_at: '2026-07-17T00:00:00.000Z',
      claimed_at: null,
      last_login_at: null,
    },
    members: [
      {
        id: 'm1',
        name: 'Sofia',
        email: 'sofia@adios.com',
        role: 'MEMBER' as const,
        joined_at: '2026-07-16T00:00:00.000Z',
        last_login_at: null,
      },
    ],
  }

  it('maps the household, admin, and members', () => {
    const detail = toHouseholdDetail(wire)

    expect(detail.household.createdAt).toBe('2026-07-15T00:00:00.000Z')
    expect(detail.household.scheduledDeletionDate).toBeNull()
    expect(detail.admin?.claimStatus).toBe('PENDING_INVITE')
    expect(detail.admin?.inviteExpiresAt).toBe('2026-07-17T00:00:00.000Z')
    expect(detail.members[0]).toEqual({
      id: 'm1',
      name: 'Sofia',
      email: 'sofia@adios.com',
      role: 'MEMBER',
      joinedAt: '2026-07-16T00:00:00.000Z',
      lastLoginAt: null,
    })
  })

  it('passes a null admin through as null', () => {
    expect(toHouseholdDetail({ ...wire, admin: null, members: [] }).admin).toBeNull()
  })
})

describe('request and mutation mappers', () => {
  it('sends a snake_case create body and drops an empty notes field', () => {
    expect(
      toCreateHouseholdBody({
        householdName: 'Adios Family',
        adminEmail: 'javier@adios.com',
        adminName: 'Javier',
        notes: '',
      }),
    ).toEqual({
      household_name: 'Adios Family',
      admin_email: 'javier@adios.com',
      admin_name: 'Javier',
    })
  })

  it('keeps notes when there is something to say', () => {
    expect(
      toCreateHouseholdBody({
        householdName: 'Adios Family',
        adminEmail: 'javier@adios.com',
        adminName: 'Javier',
        notes: 'VIP',
      }).notes,
    ).toBe('VIP')
  })

  it('maps the created household', () => {
    expect(
      toCreatedHousehold({
        household_id: 'h1',
        admin_id: 'a1',
        admin_email: 'javier@adios.com',
        invite_sent_at: null,
      }),
    ).toEqual({
      householdId: 'h1',
      adminId: 'a1',
      adminEmail: 'javier@adios.com',
      inviteSentAt: null,
    })
  })

  it('maps a deletion schedule', () => {
    expect(
      toHouseholdDeletion({
        household_id: 'h1',
        status: 'DELETION_PENDING',
        deletion_requested_at: '2026-08-02T10:00:00.000Z',
        scheduled_deletion_date: '2026-09-01T00:00:00.000Z',
      }),
    ).toEqual({
      householdId: 'h1',
      status: 'DELETION_PENDING',
      deletionRequestedAt: '2026-08-02T10:00:00.000Z',
      scheduledDeletionDate: '2026-09-01T00:00:00.000Z',
    })
  })

  it('maps a restore', () => {
    expect(toHouseholdRestore({ household_id: 'h1', status: 'ACTIVE' })).toEqual({
      householdId: 'h1',
      status: 'ACTIVE',
    })
  })

  it('maps a resent invite', () => {
    expect(
      toResendInvite({
        admin_email: 'javier@adios.com',
        new_expiry: '2026-08-04T10:00:00.000Z',
      }),
    ).toEqual({ adminEmail: 'javier@adios.com', newExpiry: '2026-08-04T10:00:00.000Z' })
  })
})
