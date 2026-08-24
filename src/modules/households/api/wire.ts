/**
 * The only file in this module that names a snake_case field.
 *
 * The API speaks snake_case; components speak camelCase. Everything crossing
 * that line goes through a pure function here, so a casing change on the
 * backend — and there have been two in two days — costs one file.
 */
import type { PaginationWire } from '@/utils/responseHandlers'
import type {
  AdminClaimStatus,
  CreateHouseholdInput,
  CreatedHousehold,
  HouseholdAdmin,
  HouseholdCore,
  HouseholdDeletion,
  HouseholdDetail,
  HouseholdFilters,
  HouseholdMember,
  HouseholdRestore,
  HouseholdSortField,
  HouseholdStatus,
  HouseholdSummary,
  MemberRole,
  PaginationMeta,
  ResendInvite,
} from '../types'

export type { PaginationWire }

export interface HouseholdListItemWire {
  id: string
  name: string
  status: HouseholdStatus
  created_at: string
  deletion_scheduled_for: string | null
  admin_name: string | null
  admin_email: string | null
  member_count: number
}

export interface HouseholdCoreWire {
  id: string
  name: string
  status: HouseholdStatus
  created_at: string
  deletion_requested_at: string | null
  scheduled_deletion_date: string | null
}

export interface HouseholdAdminWire {
  id: string
  name: string
  email: string
  claim_status: AdminClaimStatus
  invite_sent_at: string | null
  invite_expires_at: string | null
  claimed_at: string | null
  last_login_at: string | null
}

export interface HouseholdMemberWire {
  id: string
  name: string
  email: string
  role: MemberRole
  joined_at: string
  last_login_at: string | null
}

export interface HouseholdDetailWire {
  household: HouseholdCoreWire
  admin: HouseholdAdminWire | null
  members: HouseholdMemberWire[]
}

export interface CreateHouseholdBodyWire {
  household_name: string
  admin_email: string
  admin_name: string
  notes?: string
}

export interface CreatedHouseholdWire {
  household_id: string
  admin_id: string
  admin_email: string
  invite_sent_at: string | null
}

export interface HouseholdDeletionWire {
  household_id: string
  status: HouseholdStatus
  deletion_requested_at: string
  scheduled_deletion_date: string
}

export interface HouseholdRestoreWire {
  household_id: string
  status: HouseholdStatus
}

export interface ResendInviteWire {
  admin_email: string
  new_expiry: string
}

export interface HouseholdListQueryWire {
  page: number
  limit: number
  search?: string
  sort_by: string
  sort_order: 'ASC' | 'DESC'
  status?: HouseholdStatus
}

const SORT_FIELD_TO_WIRE: Record<HouseholdSortField, string> = {
  createdAt: 'created_at',
  name: 'name',
  adminName: 'admin_name',
  adminEmail: 'admin_email',
  memberCount: 'member_count',
}

export function toListQuery(filters: HouseholdFilters): HouseholdListQueryWire {
  const query: HouseholdListQueryWire = {
    page: filters.page,
    limit: filters.limit,
    sort_by: SORT_FIELD_TO_WIRE[filters.sortBy],
    sort_order: filters.sortOrder,
  }

  // An empty `search` would go out as `search=`, which filters on the empty
  // string rather than meaning "no filter".
  if (filters.search) query.search = filters.search

  // Likewise for status: the parameter has to be absent to mean "both", not
  // present and empty.
  if (filters.status) query.status = filters.status

  return query
}

export function toHouseholdSummary(wire: HouseholdListItemWire): HouseholdSummary {
  return {
    id: wire.id,
    name: wire.name,
    status: wire.status,
    createdAt: wire.created_at,
    deletionScheduledFor: wire.deletion_scheduled_for,
    adminName: wire.admin_name,
    adminEmail: wire.admin_email,
    memberCount: wire.member_count,
  }
}

export function toPagination(wire: PaginationWire): PaginationMeta {
  return {
    page: wire.page,
    limit: wire.limit,
    total: wire.total,
    totalPages: wire.total_pages,
  }
}

function toHouseholdCore(wire: HouseholdCoreWire): HouseholdCore {
  return {
    id: wire.id,
    name: wire.name,
    status: wire.status,
    createdAt: wire.created_at,
    deletionRequestedAt: wire.deletion_requested_at,
    scheduledDeletionDate: wire.scheduled_deletion_date,
  }
}

function toHouseholdAdmin(wire: HouseholdAdminWire): HouseholdAdmin {
  return {
    id: wire.id,
    name: wire.name,
    email: wire.email,
    claimStatus: wire.claim_status,
    inviteSentAt: wire.invite_sent_at,
    inviteExpiresAt: wire.invite_expires_at,
    claimedAt: wire.claimed_at,
    lastLoginAt: wire.last_login_at,
  }
}

function toHouseholdMember(wire: HouseholdMemberWire): HouseholdMember {
  return {
    id: wire.id,
    name: wire.name,
    email: wire.email,
    role: wire.role,
    joinedAt: wire.joined_at,
    lastLoginAt: wire.last_login_at,
  }
}

export function toHouseholdDetail(wire: HouseholdDetailWire): HouseholdDetail {
  return {
    household: toHouseholdCore(wire.household),
    admin: wire.admin ? toHouseholdAdmin(wire.admin) : null,
    members: wire.members.map(toHouseholdMember),
  }
}

export function toCreateHouseholdBody(input: CreateHouseholdInput): CreateHouseholdBodyWire {
  const body: CreateHouseholdBodyWire = {
    household_name: input.householdName,
    admin_email: input.adminEmail,
    admin_name: input.adminName,
  }

  // The field is optional and capped at 1000 chars; an empty string is not a note.
  if (input.notes) body.notes = input.notes

  return body
}

export function toCreatedHousehold(wire: CreatedHouseholdWire): CreatedHousehold {
  return {
    householdId: wire.household_id,
    adminId: wire.admin_id,
    adminEmail: wire.admin_email,
    inviteSentAt: wire.invite_sent_at,
  }
}

export function toHouseholdDeletion(wire: HouseholdDeletionWire): HouseholdDeletion {
  return {
    householdId: wire.household_id,
    status: wire.status,
    deletionRequestedAt: wire.deletion_requested_at,
    scheduledDeletionDate: wire.scheduled_deletion_date,
  }
}

export function toHouseholdRestore(wire: HouseholdRestoreWire): HouseholdRestore {
  return {
    householdId: wire.household_id,
    status: wire.status,
  }
}

export function toResendInvite(wire: ResendInviteWire): ResendInvite {
  return {
    adminEmail: wire.admin_email,
    newExpiry: wire.new_expiry,
  }
}

const FORM_FIELD_FROM_WIRE: Record<string, keyof CreateHouseholdInput> = {
  household_name: 'householdName',
  admin_email: 'adminEmail',
  admin_name: 'adminName',
  notes: 'notes',
}

/**
 * The create form's field for a `field` named in a validation error, or
 * undefined when the backend blamed something the form does not render.
 */
export function toCreateFormField(wireField: string): keyof CreateHouseholdInput | undefined {
  return FORM_FIELD_FROM_WIRE[wireField]
}
