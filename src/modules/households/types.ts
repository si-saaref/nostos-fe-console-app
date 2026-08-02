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
  name: string
  email: string
  claimStatus: AdminClaimStatus
  lastLoginAt: string | null
  inviteSentAt: string | null
}

export interface HouseholdDetail {
  id: string
  name: string
  status: HouseholdStatus
  createdAt: string
  scheduledDeletionDate: string | null
  graceExpiresAt: string | null
  admin: HouseholdAdmin
  members: HouseholdMember[]
}

export interface HouseholdsListResponse {
  data: HouseholdSummary[]
  page: number
  totalPages: number
  total: number
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
  sort: string
}
