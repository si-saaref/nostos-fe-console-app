# PRD: Console Authentication & Household Mgmt — BACKEND SPECIFICATION

**Version:** 3.0 (BE-Focused)  
**Audience:** Backend Engineers (NestJS, Passport.js, PostgreSQL)  
**Last Updated:** July 31, 2026  

---

## Quick Reference

| Requirement | Specification |
|------------|---|
| **Auth Method** | Magic link (Resend email) |
| **Session Duration** | 7 days + activity-based refresh (4-day threshold) |
| **Rate Limits** | Signin: 5/email/hr, Resend: 1/admin/day |
| **Deletion Grace** | 30 days, purge at midnight UTC (not relative) |
| **Audit Trail** | YES — track operator_id, action, household_id, timestamp, IP |
| **Error Handling** | See Section 2 (all errors mapped to HTTP status + message) |
| **Email Provider** | Resend only (no fallback in Phase 1) |

---

## Section 1: API Endpoints (Complete Specification)

### POST /console/auth/signin
**Purpose:** Generate magic signin link

**Request:**
```json
{
  "email": "operator@nostos.com"
}
```

**Validation:**
- Email: Required, valid format (RFC or simplified)
- Email must exist in `operators` table with `status = 'ACTIVE'`

**Response (200):**
```json
{
  "success": true,
  "message": "Check your email for a signin link",
  "email": "operator@nostos.com"
}
```

**Response (401):**
```json
{
  "error": "Email not authorized to access console"
}
```
*Note: Don't leak whether email exists (prevent user enumeration)*

**Response (429):**
```json
{
  "error": "Too many signin attempts. Try again in 1 hour."
}
```

**Business Logic:**
- Generate magic link token (32+ bytes, cryptographically secure)
- Store as SHA256 hash in `invites` table
- Expiry: 15 minutes
- Type: `OPERATOR_SIGNIN`
- Send via Resend (within 5s)
- Rate limit: 5 attempts per email per hour (track in Redis or DB)

---

### GET /console/auth/signin/:token
**Purpose:** Validate token + create operator session

**Validation:**
- Token: Must exist in DB (SHA256 match)
- Token: Must not be used already (`used_at IS NULL`)
- Token: Must not be expired (`expires_at > now`)
- Token type: Must be `OPERATOR_SIGNIN`

**Response (302 Redirect):**
```
Location: /console/dashboard
Set-Cookie: connect.sid=...; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=[7 days]
```

**Session Payload:**
```json
{
  "operator_id": "UUID",
  "email": "operator@nostos.com",
  "role": "OPERATOR",
  "session_created_at": "2026-07-31T10:00:00Z",
  "expires_at": "2026-08-07T10:00:00Z",
  "last_activity_at": "2026-07-31T10:00:00Z"
}
```

**Business Logic:**
- Validate token
- Call `session.regenerate()` (prevent session fixation)
- Set `invites.used_at = now` (mark as used)
- Audit log: `action='SIGNIN', success=true`
- Redirect to dashboard

**Response (404):**
```json
{
  "error": "Link invalid or expired"
}
```

---

### POST /console/households
**Purpose:** Create household + admin account

**Request:**
```json
{
  "household_name": "Adios Family",
  "admin_email": "javier@adios.com",
  "admin_name": "Javier",
  "notes": "Early adopter, VIP tier"
}
```

**Validation:**
```
household_name:
  ✓ Required, 1-100 chars
  ✓ UNIQUE (case-insensitive)
  ✓ Allowed: Letters, numbers, spaces, hyphens, apostrophes
  ✗ Reject: Leading/trailing spaces, special chars

admin_email:
  ✓ Required, valid format
  ✓ NOT already in users table (admin or member)
  ✓ Lowercase normalized
  
admin_name:
  ✓ Required, 1-50 chars
  ✓ Allowed: Letters, spaces, hyphens, apostrophes
  ✗ Reject: Numbers, special chars
```

**Response (201):**
```json
{
  "success": true,
  "household_id": "hhd_abc123",
  "admin_id": "usr_xyz789",
  "invite_sent_at": "2026-07-31T10:05:23Z",
  "message": "Household created. Invite sent to javier@adios.com"
}
```

**Response (409):**
```json
{
  "error": "Household name already in use"
}
```
OR
```json
{
  "error": "Email already registered as admin"
}
```

**Business Logic:**
1. Validate all fields
2. Check household name uniqueness (ILIKE to handle case-insensitivity)
3. Check admin email not in `users` table
4. Create household record:
   ```
   name, status='ACTIVE', created_at=now, 
   deletion_requested_at=NULL, scheduled_deletion_date=NULL
   ```
5. Create user record:
   ```
   email, household_id, role='ADMIN', 
   deleted_at=NULL, last_activity_at=now
   ```
6. Create invite record:
   ```
   household_id, email, role='ADMIN',
   token_type='ADMIN_CLAIM', token=SHA256(random_32bytes),
   expires_at=now+48h, used_at=NULL
   ```
7. Send email via Resend
8. Audit log: `action='CREATE_HOUSEHOLD'`
9. Return 201 with IDs

**Idempotency:**
- If same request resubmitted within 5s: Return 201 again (prevent double-create)
- Check: If household with exact same name + admin_email exists within last 5 mins, return existing IDs

---

### GET /console/households
**Purpose:** List all households (paginated, searchable)

**Query Parameters:**
```
page=1 (default)
limit=50 (default, max 100)
search='' (optional, search household name or admin email)
sort_by='created_at' (default, or: 'name', 'admin_name', 'admin_email', 'member_count')
sort_order='DESC' (default)
status='ACTIVE' (optional, filter by status)
```

**Response (200):**
```json
{
  "success": true,
  "households": [
    {
      "id": "hhd_abc123",
      "name": "Adios Family",
      "admin_name": "Javier",
      "admin_email": "javier@adios.com",
      "created_at": "2026-07-15T00:00:00Z",
      "member_count": 4,
      "status": "ACTIVE",
      "deletion_scheduled_for": null
    },
    {
      "id": "hhd_xyz789",
      "name": "Smith Household",
      "admin_name": "John",
      "admin_email": "john@smith.com",
      "created_at": "2026-07-10T00:00:00Z",
      "member_count": 3,
      "status": "DELETION_PENDING",
      "deletion_scheduled_for": "2026-08-09"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 342,
    "total_pages": 7
  }
}
```

**Business Logic:**
1. Fetch households with:
   - JOIN on users (admin)
   - COUNT of non-deleted members
   - Filter by status (optional)
   - Search by name ILIKE or admin email ILIKE
   - Sort by specified field
   - Limit/offset for pagination
2. Indexes: `households(status, deletion_requested_at)`, `users(household_id)`

**Query Example (SQL):**
```sql
SELECT 
  h.id, h.name, h.status, h.created_at, h.scheduled_deletion_date,
  u.name as admin_name, u.email as admin_email,
  COUNT(u2.id) as member_count
FROM households h
LEFT JOIN users u ON h.id = u.household_id AND u.role = 'ADMIN'
LEFT JOIN users u2 ON h.id = u2.household_id AND u2.deleted_at IS NULL
WHERE (h.name ILIKE :search OR u.email ILIKE :search)
  AND h.status = :status (if provided)
GROUP BY h.id, u.id
ORDER BY h.created_at DESC
LIMIT :limit OFFSET :offset;
```

---

### GET /console/households/:id
**Purpose:** Get household details + members

**Response (200):**
```json
{
  "success": true,
  "household": {
    "id": "hhd_abc123",
    "name": "Adios Family",
    "status": "ACTIVE",
    "created_at": "2026-07-15T00:00:00Z",
    "deletion_requested_at": null,
    "scheduled_deletion_date": null
  },
  "admin": {
    "id": "usr_admin123",
    "name": "Javier",
    "email": "javier@adios.com",
    "claim_status": "CLAIMED",
    "claimed_at": "2026-07-15T01:00:00Z",
    "last_login_at": "2026-07-30T14:30:00Z"
  },
  "members": [
    {
      "id": "usr_member1",
      "name": null,
      "email": "sofia@adios.com",
      "role": "MEMBER",
      "joined_at": "2026-07-16T00:00:00Z",
      "last_activity_at": "2026-07-30T08:15:00Z"
    },
    ...
  ]
}
```

**Response (404):**
```json
{
  "error": "Household not found"
}
```

**Business Logic:**
1. Fetch household by ID
2. Fetch admin user (role='ADMIN')
3. Determine claim_status:
   - If `users.deleted_at IS NOT NULL` → "Deleted"
   - If exists invite with `used_at IS NOT NULL` → "Claimed"
   - If exists invite with `used_at IS NULL` AND not expired → "Pending (expires in Xh)"
   - If exists invite with `used_at IS NULL` AND expired → "Invite Expired"
4. Fetch all members (non-deleted, all roles, ordered by joined_at)

---

### POST /console/households/:id/delete
**Purpose:** Soft-delete household (mark for deletion with 30-day grace)

**Request:**
```json
{
  "confirmation": "DELETE"
}
```

**Validation:**
- confirmation must equal "DELETE" (case-sensitive)
- Household must exist
- Household status must be "ACTIVE" (can't delete already-deleted)

**Response (200):**
```json
{
  "success": true,
  "household_id": "hhd_abc123",
  "status": "DELETION_PENDING",
  "deletion_requested_at": "2026-07-31T10:00:00Z",
  "scheduled_deletion_date": "2026-08-30",
  "message": "Household marked for deletion. Will be deleted on 2026-08-30."
}
```

**Response (400):**
```json
{
  "error": "Household is already marked for deletion"
}
```

**Business Logic:**
1. Calculate `scheduled_deletion_date`:
   ```
   today = DATE(now)
   tomorrow = today + 1 day
   scheduled_deletion_date = tomorrow + 29 days (= today + 30 days)
   
   Example: Request on 2026-07-31 (Thursday)
   → today = 2026-07-31
   → tomorrow = 2026-08-01
   → scheduled = 2026-08-01 + 29 days = 2026-08-30 (Friday)
   
   Purge happens at midnight UTC on 2026-08-30 (scheduled job)
   ```
2. Update household:
   ```
   status = 'DELETION_PENDING'
   deletion_requested_at = now
   scheduled_deletion_date = (calculated date)
   ```
3. Send email to admin
4. Audit log: `action='DELETE_HOUSEHOLD'`
5. Return 200

**Midnight UTC Calculation (Code Example):**
```javascript
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const tomorrow = new Date(today.getTime() + 86400000); // +1 day in ms
const scheduledDeletion = new Date(tomorrow.getTime() + 29 * 86400000); // +29 more days
// scheduledDeletion is now at midnight UTC on day+30
```

---

### POST /console/households/:id/restore
**Purpose:** Undo soft-delete (revert from DELETION_PENDING to ACTIVE)

**Request:**
```json
{}
```

**Validation:**
- Household must exist
- Household status must be "DELETION_PENDING"
- `scheduled_deletion_date > TODAY()` (grace period not expired)

**Response (200):**
```json
{
  "success": true,
  "household_id": "hhd_abc123",
  "status": "ACTIVE",
  "message": "Household restored successfully"
}
```

**Response (400):**
```json
{
  "error": "This household cannot be restored (grace period expired)"
}
```

**Business Logic:**
1. Check: `scheduled_deletion_date > TODAY()`
2. If not: Return 400 error
3. If yes:
   - Update: `status = 'ACTIVE'`, `deletion_requested_at = NULL`, `scheduled_deletion_date = NULL`
   - Send email to admin: "Your household has been restored"
   - Audit log: `action='RESTORE_HOUSEHOLD'`
   - Return 200

---

### POST /console/households/:id/admin/resend-invite
**Purpose:** Resend admin claim link (manual, rate-limited)

**Request:**
```json
{}
```

**Validation:**
- Household must exist
- Admin must exist for household
- Admin must be in PENDING_INVITE state (not already claimed)
- Rate limit: Max 1 resend per admin per day

**Response (200):**
```json
{
  "success": true,
  "message": "Invite resent to javier@adios.com. Expires in 48 hours.",
  "new_expiry": "2026-08-02T10:05:00Z"
}
```

**Response (429):**
```json
{
  "error": "Can't resend. Last sent 4 hours ago. Try again in 20 hours."
}
```

**Business Logic:**
1. Fetch admin user + existing invite (if any)
2. Check rate limit: `WHERE admin_email = X AND action = 'RESEND_INVITE' AND timestamp > now - 24h`
   - If count > 0: Return 429
3. Generate new invite token (SHA256 hash)
4. Either:
   - Option A: Update existing invite row (set new token + expires_at)
   - Option B: Mark old invite as invalidated, create new row
5. Send email with new link
6. Audit log: `action='RESEND_INVITE'`, store admin_email in details
7. Return 200

---

### GET /console/dashboard/metrics
**Purpose:** Platform health metrics (read-only)

**Response (200):**
```json
{
  "success": true,
  "metrics": {
    "households": {
      "total": 42,
      "active": 40,
      "pending_deletion": 2,
      "new_this_week": 5
    },
    "members": {
      "total": 234,
      "active_7d": 189
    },
    "health": {
      "failed_signins_24h": 3,
      "failed_emails_24h": 0
    }
  },
  "last_updated": "2026-07-31T10:05:00Z"
}
```

**Business Logic (Efficient Queries):**
```sql
-- Households
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN status = 'DELETION_PENDING' THEN 1 ELSE 0 END) as pending_deletion,
  SUM(CASE WHEN created_at > now - 7 days THEN 1 ELSE 0 END) as new_this_week
FROM households;

-- Members
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN last_activity_at > now - 7 days THEN 1 ELSE 0 END) as active_7d
FROM users WHERE deleted_at IS NULL;

-- Health (from audit logs or invites table)
SELECT
  (SELECT COUNT(*) FROM operator_audit_logs WHERE action = 'SIGNIN' AND timestamp > now - 24h AND details->>'success' = 'false') as failed_signins,
  (SELECT COUNT(*) FROM invites WHERE used_at IS NOT NULL AND expires_at < now AND timestamp > now - 24h) as failed_emails
```

---

### POST /console/auth/logout
**Purpose:** Destroy current operator session

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Business Logic:**
1. Destroy session (clear `connect.sid` cookie)
2. Audit log: `action='LOGOUT'`
3. Return 200

---

## Section 2: Guards & Middleware

### OperatorGuard
**Purpose:** Verify request is from authenticated operator

**Logic:**
```
Check request.session.operator_id exists
Check operator_id matches entry in operators table
Check operators.status = 'ACTIVE'
If all pass → continue
If fail → return 401 Unauthorized
```

**Applied to:**
- All console endpoints except `/console/auth/signin` and `/console/auth/signin/:token`

### ActivityRefreshGuard
**Purpose:** Same as NOSTOS app (update last_activity_at, check 4-day threshold)

**Logic:**
```
if (now - session.last_activity_at >= 4 days) {
  session.expires_at = now + 7 days
}
session.last_activity_at = now
```

**Applied to:**
- All authenticated endpoints (refreshes operator session)

---

## Section 3: Database Indexes (Performance)

```sql
-- Operators
CREATE INDEX idx_operators_email ON operators(email);
CREATE INDEX idx_operators_status ON operators(status);

-- Households
CREATE INDEX idx_households_status ON households(status);
CREATE INDEX idx_households_deletion_date ON households(scheduled_deletion_date);
CREATE INDEX idx_households_name ON households(name);

-- Users (for household admin lookup)
CREATE INDEX idx_users_household_role ON users(household_id, role);
CREATE INDEX idx_users_household_deleted ON users(household_id, deleted_at);

-- Invites
CREATE INDEX idx_invites_household ON invites(household_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_expires ON invites(expires_at);
CREATE INDEX idx_invites_used ON invites(used_at);

-- Audit logs
CREATE INDEX idx_audit_operator_ts ON operator_audit_logs(operator_id, timestamp);
CREATE INDEX idx_audit_household_ts ON operator_audit_logs(household_id, timestamp);
CREATE INDEX idx_audit_action ON operator_audit_logs(action, timestamp);
```

---

## Section 4: Rate Limiting

### Signin Attempts
- **Limit:** 5 per email per hour
- **Storage:** Redis or DB (track with timestamps)
- **Response:** 429 Too Many Requests

### Resend Invites
- **Limit:** 1 per admin per day
- **Storage:** Check `operator_audit_logs` for recent resends
- **Response:** 429 Too Many Requests (with "try again in X hours")

---

## Section 5: Audit Trail Implementation

**What to Track:**
```
- CREATE_HOUSEHOLD: operator_id, household_id, household_name, admin_email, timestamp
- DELETE_HOUSEHOLD: operator_id, household_id, scheduled_deletion_date, timestamp
- RESTORE_HOUSEHOLD: operator_id, household_id, timestamp
- RESEND_INVITE: operator_id, household_id, admin_email, timestamp
- SIGNIN: operator_id (if success), email, timestamp, ip_address, success/failure
```

**Insert Example:**
```javascript
await db.query(
  `INSERT INTO operator_audit_logs 
   (operator_id, action, household_id, details, timestamp, ip_address, user_agent)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [
    operator_id,
    'CREATE_HOUSEHOLD',
    household_id,
    JSON.stringify({ household_name, admin_email, admin_name }),
    new Date(),
    req.ip,
    req.get('user-agent')
  ]
);
```

---

## Section 6: Error Handling & HTTP Status Codes

```
200 OK → Successful operation
201 Created → Household created successfully
302 Found → Signin token valid, redirect to dashboard
400 Bad Request → Validation failed, missing fields
401 Unauthorized → Not authenticated or not authorized
404 Not Found → Resource not found (token expired, household not found)
409 Conflict → Duplicate resource (household name, admin email)
429 Too Many Requests → Rate limit exceeded
500 Internal Server Error → Server error (include error ID for support)
```

**Error Response Format:**
```json
{
  "error": "Human-readable message",
  "error_code": "OPTIONAL_MACHINE_CODE",
  "error_id": "req_uuid_for_logs"
}
```

---

## Section 7: Email Sending (Resend Integration)

### Operator Signin Email
**Subject:** "Sign in to NOSTOS Operator Console"  
**Template:** React Email component  
**Includes:** Magic link (valid 15 min), expiry message

### Admin Claim Email
**Subject:** "Claim your NOSTOS Household"  
**Template:** React Email component  
**Includes:** Household name, magic link (valid 48h), admin name

### Household Deleted Email
**Subject:** "Your NOSTOS household will be deleted"  
**Template:** React Email component  
**Includes:** Deletion date, restore instructions, link to contact support

### Household Restored Email
**Subject:** "Your NOSTOS household has been restored"  
**Template:** React Email component  
**Includes:** Confirmation message

---

## Section 8: Deployment Checklist

- [ ] Audit trail table created + indexes
- [ ] Deletion grace period calculation tested (midnight UTC math)
- [ ] Rate limiting implemented (Redis or DB)
- [ ] All guards applied to endpoints
- [ ] Error handling tested (all 9 error cases)
- [ ] Email templates created (Resend)
- [ ] Session configuration verified (7 days, HttpOnly, Secure, SameSite=Lax)
- [ ] Indexes created (all 10 indexes listed)
- [ ] Audit log inserts working (6 actions tracked)

---

## Sign-Off

**Backend Owner:** [Name]  
**Status:** Ready for Implementation  
**Frontend Counterpart:** PRD-Authentication-Console-FE.md
