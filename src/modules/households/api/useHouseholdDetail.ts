import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapBackendResponse } from '@/utils/responseHandlers'
import type { HouseholdDetail, HouseholdDetailBackendResponse } from '../types'

export function useHouseholdDetail(householdId: string) {
  return useQuery({
    queryKey: ['console', 'household', householdId],
    queryFn: async (): Promise<HouseholdDetail> => {
      const response = await apiClient.get<HouseholdDetailBackendResponse>(
        `/console/households/${householdId}`,
      )

      const backend = response.data
      const unwrapped = unwrapBackendResponse<HouseholdDetailBackendResponse>(backend)
      const data = unwrapped || backend

      // Transform backend response to frontend format
      return {
        id: data.household.id,
        name: data.household.name,
        status: data.household.status,
        createdAt: data.household.created_at,
        scheduledDeletionDate: data.household.scheduled_deletion_date,
        admin: {
          id: data.admin.id,
          name: data.admin.name,
          email: data.admin.email,
          claimStatus: data.admin.claim_status,
          claimedAt: data.admin.claimed_at,
          lastLoginAt: data.admin.last_login_at,
        },
        members: data.members.map(m => ({
          id: m.id,
          name: m.name || '',
          email: m.email,
          joinedAt: m.joined_at,
        })),
      }
    },
    enabled: !!householdId,
  })
}
