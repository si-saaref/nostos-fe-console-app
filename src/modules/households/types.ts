export type HouseholdStatus = 'ACTIVE' | 'DELETION_PENDING'
export type AdminClaimStatus = 'PENDING_INVITE' | 'CLAIMED'

export interface HouseholdSummary {
  id: string
  name: string
  adminName: string
  adminEmail: string
  createdAt: string
  memberCount: number
  status: HouseholdStatus
}

export interface HouseholdMember {
  id: string
  name: string
  email: string
  joinedAt: string
}

export interface HouseholdAdmin {
  id: string
  name: string
  email: string
  claimStatus: AdminClaimStatus
  claimedAt: string | null
  lastLoginAt: string | null
}

export interface HouseholdDetail {
  id: string
  name: string
  status: HouseholdStatus
  createdAt: string
  scheduledDeletionDate: string | null
  admin: HouseholdAdmin
  members: HouseholdMember[]
}

export interface HouseholdDetailBackendResponse {
  success: boolean
  household: {
    id: string
    name: string
    status: HouseholdStatus
    created_at: string
    deletion_requested_at: string | null
    scheduled_deletion_date: string | null
  }
  admin: {
    id: string
    name: string
    email: string
    claim_status: AdminClaimStatus
    claimed_at: string | null
    last_login_at: string | null
  }
  members: Array<{
    id: string
    name: string | null
    email: string
    role: string
    joined_at: string
    last_activity_at: string | null
  }>
}

export interface HouseholdsListResponse {
  data: HouseholdSummary[]
  page: number
  totalPages: number
  total: number
}

export interface HouseholdsBackendResponse {
  success: boolean
  households: Array<{
    id: string
    name: string
    admin_name: string
    admin_email: string
    created_at: string
    member_count: number
    status: HouseholdStatus
    deletion_scheduled_for: string | null
  }>
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface CreateHouseholdInput {
  household_name: string
  admin_email: string
  admin_name: string
  notes?: string
}

export interface HouseholdFilters {
  page: number
  search: string
  sort_by?: string
  sort_order?: 'ASC' | 'DESC'
}
