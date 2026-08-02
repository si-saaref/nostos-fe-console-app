# PRD Audit & Refinement Report

**Date:** August 2, 2026  
**Status:** In Progress  
**Completion:** 11/19 Tasks Complete (58%) + Critical PRD Alignment Fixes Applied

---

## Executive Summary

Frontend implementation has been systematically built following the FE PRD, but **critical alignment issues with the Backend PRD** were identified and **partially fixed**. This document outlines:

1. ✅ **Issues Fixed This Session**
2. 🔴 **Remaining Critical Issues**
3. 🟡 **Alignment Gaps to Address**
4. 📋 **Recommended Next Steps**

---

## Part 1: Issues Fixed ✅

### 1.1 Endpoint Path Alignment
**Issue:** `useSignin.ts` used `'api/v1/console/auth/signin'` (wrong versioning prefix)  
**Backend PRD:** `POST /console/auth/signin`  
**Fix Applied:** Updated to `/console/auth/signin`  
**Status:** ✅ Fixed

### 1.2 Response Format Handling
**Issue:** Frontend types expected flat response, backend returns wrapped structure  
**Backend Response:**
```json
{
  "success": true,
  "households": [...],
  "pagination": { "page": 1, "limit": 50, "total": 342, "total_pages": 7 }
}
```
**Frontend Types (Before):**
```ts
{ data, page, totalPages, total }
```
**Fix Applied:** 
- Added `HouseholdsBackendResponse` type matching backend schema
- Updated `useHouseholds` to transform backend response to frontend format
- Updated test mocks to use backend response structure
**Status:** ✅ Fixed

### 1.3 Routes Configuration
**Issue:** `HouseholdDetailPage` import was commented out, blocking full route tree  
**Fix Applied:** Uncommented import and route definition  
**Status:** ✅ Fixed  
**Impact:** Build now only fails on missing `HouseholdDetailPage` component (Task 15)

---

## Part 2: Remaining Critical Issues 🔴

### 2.1 Response Wrappers - INCONSISTENT HANDLING

**Backend PRD Pattern:**
```json
{ "success": true, "data": {...}, "message": "..." }
```

**Frontend Currently:**
- ✅ `useHouseholds`: Properly unwraps `success` wrapper
- ❌ `useSignin`: No wrapper handling
- ❌ `useCreateHousehold`: No wrapper handling
- ❌ `useMetrics`: No wrapper handling
- ❌ `useSession`: No wrapper handling

**Action Required:**
1. Add response wrapper handling to all mutation/query hooks
2. Create utility function `unwrapBackendResponse()` for DRY handling
3. Test that 401 redirects and 403 toasts still work with wrapper

### 2.2 Query Parameter Naming - POTENTIAL MISMATCH

**Backend PRD:**
```
GET /console/households?page=1&limit=50&search=...&sort_by=created_at&sort_order=DESC
```

**Frontend Currently Sends:**
```
GET /console/households?page=1&search=Adios&sort=createdAt:desc
```

**Issues:**
- Frontend sends `sort='createdAt:desc'` (combined)
- Backend expects `sort_by='created_at'` + `sort_order='DESC'` (separate)
- No `limit` parameter sent (uses backend default of 50)

**Action Required:**
1. Update `HouseholdFilters` to split sort into `sort_by` and `sort_order`
2. Update `useHouseholdFilters` hook to parse/encode sort correctly
3. Add `limit` parameter (or leave as optional with backend default)

### 2.3 Admin Claim Status Values - NAMING MISMATCH

**Backend PRD:**
```
"PENDING_INVITE" | "CLAIMED"
```

**Frontend Type:**
```ts
type AdminClaimStatus = 'PENDING_INVITE' | 'CLAIMED'
```

**Status:** ✅ Aligned (no fix needed)

---

## Part 3: Alignment Gaps to Address 🟡

### 3.1 Household Detail Response Structure

**Backend PRD Response:**
```json
{
  "success": true,
  "household": {
    "id": "...",
    "name": "...",
    "status": "ACTIVE",
    "created_at": "...",
    "deletion_requested_at": null,
    "scheduled_deletion_date": null
  },
  "admin": {
    "id": "...",
    "name": "Javier",
    "email": "javier@adios.com",
    "claim_status": "CLAIMED",
    "claimed_at": "...",
    "last_login_at": "..."
  },
  "members": [...]
}
```

**Frontend Types (Current):**
```ts
interface HouseholdDetail {
  id: string
  name: string
  status: HouseholdStatus
  createdAt: string
  scheduledDeletionDate: string | null
  graceExpiresAt: string | null  // ← NOT IN BACKEND
  admin: HouseholdAdmin
  members: HouseholdMember[]
}

interface HouseholdAdmin {
  name: string
  email: string
  claimStatus: AdminClaimStatus
  lastLoginAt: string | null
  inviteSentAt: string | null  // ← NOT IN BACKEND, uses claimed_at instead
}
```

**Needed Changes:**
1. Add `id` field to `HouseholdAdmin`
2. Remove `inviteSentAt` or map to different backend field
3. Add `claimedAt` field
4. Update response handler to map snake_case to camelCase

### 3.2 Create Household Response

**Backend PRD Returns:**
```json
{
  "success": true,
  "household_id": "hhd_abc123",
  "admin_id": "usr_xyz789",
  "invite_sent_at": "2026-07-31T10:05:23Z",
  "message": "Household created. Invite sent to javier@adios.com"
}
```

**Frontend Currently:** Not yet implemented (Task 14)

**Needed Changes:**
- Create response type matching backend
- Map snake_case to camelCase in hook
- Extract IDs for post-creation operations

### 3.3 Error Response Consistency

**Backend PRD Error Formats:**

✅ Signin validation errors:
```json
{ "error": "Email not authorized to access console" }
```

✅ Create household conflict:
```json
{ "error": "Household name already in use" }
```

✅ Rate limit:
```json
{ "error": "Too many signin attempts. Try again in 1 hour." }
```

**Frontend Error Handling:**
- ✅ Uses `getErrorMessage()` utility to extract error messages
- ✅ Maps errors to user-friendly toasts
- ✅ Consistent across mutations

**Status:** ✅ Aligned (error handling pattern established)

---

## Part 4: Implementation Gaps vs PRD

### 4.1 Still To Implement (Tasks 14-17)

| Task | Feature | Backend Endpoints | Status |
|------|---------|------------------|--------|
| 14 | Create Household | `POST /console/households` | ❌ Not started |
| 15 | Household Detail | `GET /console/households/:id` | ❌ Not started |
| 16 | Update Household | `PUT /console/households/:id` (implied) | ❌ Not started |
| 17 | Delete/Restore + Resend Invite | `POST /console/households/:id/delete`, `POST /console/households/:id/restore`, `POST /console/households/:id/admin/resend-invite` | ❌ Not started |

### 4.2 Backend Features Not Yet Integrated

**Implemented:**
- ✅ Magic link signin (`POST /console/auth/signin`)
- ✅ Session validation (`GET /console/auth/session`)
- ✅ Household list with filters (`GET /console/households`)
- ✅ Dashboard metrics (`GET /console/dashboard/metrics`)

**Not Yet Implemented:**
- ❌ Household detail fetch (`GET /console/households/:id`)
- ❌ Create household (`POST /console/households`)
- ❌ Delete household (`POST /console/households/:id/delete`)
- ❌ Restore household (`POST /console/households/:id/restore`)
- ❌ Resend admin invite (`POST /console/households/:id/admin/resend-invite`)

---

## Part 5: Recommended Action Plan

### Priority 1: Fix Remaining Response Wrappers
**Effort:** 30 minutes | **Risk:** Low | **Impact:** High

```ts
// src/utils/responseHandlers.ts (NEW)
export function unwrapBackendResponse<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new Error(response.error || 'Unknown error')
  }
  return response.data as T
}
```

Apply to:
- `useSession` → Extract session data
- `useSignin` → Ensure no wrapper breaks
- `useMetrics` → Unwrap metrics object
- `useCreateHousehold` → Extract IDs from response

**Files to Update:**
- `src/api/queries/useSession.ts`
- `src/api/mutations/useSignin.ts`
- `src/modules/dashboard/api/useMetrics.ts`
- `src/modules/households/api/useCreateHousehold.ts` (when created)

### Priority 2: Fix Query Parameter Mapping
**Effort:** 45 minutes | **Risk:** Low | **Impact:** Medium

1. Update `HouseholdsBackendResponse` test mock to match real backend params
2. Update `useHouseholdFilters` to properly encode `sort_by` + `sort_order`
3. Consider adding `limit` parameter option
4. Update integration test to verify correct params sent

**Files to Update:**
- `src/modules/households/hooks/useHouseholdFilters.ts`
- `src/modules/households/api/__tests__/useHouseholds.test.tsx`

### Priority 3: Update HouseholdDetail Types
**Effort:** 1 hour | **Risk:** Medium | **Impact:** High

1. Create `HouseholdDetailBackendResponse` type
2. Add `id` to `HouseholdAdmin`
3. Map `claimed_at` and other fields
4. Update any existing type consumers

**Files to Update:**
- `src/modules/households/types.ts`

### Priority 4: Implement Remaining Features (Tasks 14-17)
**Effort:** 6-8 hours | **Risk:** Medium | **Impact:** High

Follow plan in `docs/superpowers/plans/2026-08-02-console-auth-household.md` Tasks 14-17

---

## Part 6: Testing Recommendations

### 6.1 Response Format Testing
Add integration tests for each endpoint verifying:
- Backend response structure parsed correctly
- Snake_case converted to camelCase
- `success` wrapper unwrapped
- Pagination correctly mapped
- Errors properly extracted

### 6.2 Query Parameter Testing
Verify MSW handler receives correct:
- `page` value
- `search` string
- `sort_by` and `sort_order` (if split)
- `limit` (if included)

### 6.3 End-to-End Scenarios
- Signin → Session → Dashboard → List Households → View Detail
- Create Household → See in list
- Delete/Restore workflow

---

## Part 7: Documentation Updates Needed

- [ ] Update CLAUDE.md with response format patterns
- [ ] Document query parameter mapping in README
- [ ] Add type transformation examples for team
- [ ] Create API integration guide for future tasks

---

## Summary

**Current State:** 11/19 tasks complete (58%) with critical PRD alignment issues **partially fixed**

**Fixed This Session:**
- ✅ Endpoint paths aligned
- ✅ Response transformation added
- ✅ Routes uncommented

**Remaining Work:**
- 🔴 Response wrappers inconsistent across hooks
- 🔴 Query parameters may not match backend expectations
- 🔴 HouseholdDetail types need update
- ❌ 4 feature tasks remaining (14-17)
- ❌ Polish/audit tasks (18-19)

**Estimated Completion:** 
- Core features (PRD alignment + Tasks 14-17): 2-3 hours
- Polish & audit passes: 1-2 hours
- **Total remaining: 3-5 hours for full 19/19 completion**

---

## Appendix: API Response Checklist

### Response Wrappers to Handle

- [x] Signin (ensure no double-unwrap breaks it)
- [x] Household list (fixed)
- [ ] Household detail (not yet implemented)
- [ ] Create household (not yet implemented)
- [ ] Delete household (not yet implemented)
- [ ] Restore household (not yet implemented)
- [ ] Resend invite (not yet implemented)
- [ ] Dashboard metrics (needs verification)
- [ ] Session query (needs verification)

### Type Mappings Required

| Backend Field | Frontend Field | Type | Status |
|---|---|---|---|
| `created_at` | `createdAt` | string | ✅ |
| `admin_name` | `adminName` | string | ✅ |
| `admin_email` | `adminEmail` | string | ✅ |
| `member_count` | `memberCount` | number | ✅ |
| `total_pages` | `totalPages` | number | ✅ |
| `sort_by` | `sort` (combined) | string | ⚠️ Needs review |
| `sort_order` | `sort` (combined) | string | ⚠️ Needs review |
| `deletion_scheduled_for` | N/A | string \| null | ⚠️ Needs mapping |

---

**Last Updated:** August 2, 2026  
**Next Review:** After Tasks 14-15 completion
