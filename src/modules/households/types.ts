/**
 * Domain types for the households module — camelCase, and the only shapes
 * components are allowed to see. The API speaks snake_case; the translation
 * lives in `api/wire.ts`.
 */

export type HouseholdStatus = 'ACTIVE' | 'DELETION_PENDING'

/**
 * Derived by the backend, not stored: CLAIMED once the invite is used,
 * PENDING_INVITE while it is live, INVITE_EXPIRED after it lapses, DELETED when
 * the admin row is gone, NO_INVITE when none was ever issued.
 */
export type AdminClaimStatus =
  | 'CLAIMED'
  | 'PENDING_INVITE'
  | 'INVITE_EXPIRED'
  | 'DELETED'
  | 'NO_INVITE'

export type MemberRole = 'ADMIN' | 'MEMBER'

export type HouseholdSortField =
  | 'createdAt'
  | 'name'
  | 'adminName'
  | 'adminEmail'
  | 'memberCount'

export interface HouseholdSummary {
  id: string
  name: string
  status: HouseholdStatus
  createdAt: string
  /** Set only while status is DELETION_PENDING. */
  deletionScheduledFor: string | null
  /** Null when the household has no ADMIN member. */
  adminName: string | null
  /** Null when the household has no ADMIN member. */
  adminEmail: string | null
  /** Members of every role, admin included. */
  memberCount: number
}

export interface PaginationMeta {
  page: number
  limit: number
  /** Rows matching the filters, across all pages. */
  total: number
  totalPages: number
}

export interface HouseholdsListResponse {
  households: HouseholdSummary[]
  pagination: PaginationMeta
}

export interface HouseholdCore {
  id: string
  name: string
  status: HouseholdStatus
  createdAt: string
  deletionRequestedAt: string | null
  /** Midnight UTC at the end of the 30-day grace period. */
  scheduledDeletionDate: string | null
}

export interface HouseholdAdmin {
  id: string
  name: string
  email: string
  claimStatus: AdminClaimStatus
  inviteSentAt: string | null
  inviteExpiresAt: string | null
  claimedAt: string | null
  lastLoginAt: string | null
}

export interface HouseholdMember {
  id: string
  name: string
  email: string
  role: MemberRole
  joinedAt: string
  lastLoginAt: string | null
}

export interface HouseholdDetail {
  household: HouseholdCore
  /** Null when the household has no ADMIN member. */
  admin: HouseholdAdmin | null
  members: HouseholdMember[]
}

export interface HouseholdFilters {
  page: number
  search: string
  sortBy: HouseholdSortField
  sortOrder: 'ASC' | 'DESC'
}

export interface CreateHouseholdInput {
  householdName: string
  adminEmail: string
  adminName: string
  notes?: string
}

export interface CreatedHousehold {
  householdId: string
  adminId: string
  adminEmail: string
  /**
   * When the admin claim email was sent, or null when delivery failed. The
   * household is created either way.
   */
  inviteSentAt: string | null
}

export interface HouseholdDeletion {
  householdId: string
  status: HouseholdStatus
  deletionRequestedAt: string
  scheduledDeletionDate: string
}

export interface HouseholdRestore {
  householdId: string
  status: HouseholdStatus
}

export interface ResendInvite {
  adminEmail: string
  /** When the newly issued claim link expires, 48 hours out. */
  newExpiry: string
}
