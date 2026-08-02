# PRD: Console Authentication & Household Mgmt — FRONTEND SPECIFICATION

**Version:** 3.0 (FE-Focused)  
**Audience:** Frontend Engineers (React 18, TanStack Query, React Router)  
**Last Updated:** July 31, 2026  

---

## Quick Reference

| Component | Status | Notes |
|-----------|--------|-------|
| **Signin Page** | Build | Magic link only, email input |
| **Dashboard** | Build | Metrics cards, household list |
| **Household List** | Build | Paginated table, search/sort/filter |
| **Household Detail** | Build | View members, delete/restore buttons |
| **Create Household Form** | Build | 4 fields, inline validation |
| **Modals** | Build | Delete confirmation, restore confirmation |
| **Error States** | Build | All 9 error scenarios with UX messages |
| **Toast Notifications** | Build | Success/error feedback |

---

## Section 1: Page Flows & Wireframe Notes

### 1.1 Signin Flow

**URL:** `/console/signin`

**Wireframe:**
```
┌─────────────────────────────────┐
│      NOSTOS OPERATOR CONSOLE    │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Enter your email       │   │
│  │  ┌───────────────────┐  │   │
│  │  │ operator@...      │  │   │
│  │  └───────────────────┘  │   │
│  │                         │   │
│  │      [ Sign In ]        │   │
│  └─────────────────────────┘   │
│                                 │
│  Don't have access?             │
│  Contact support@nostos.com     │
└─────────────────────────────────┘
```

**UX Flow:**
1. User lands on `/console/signin`
2. Sees email input field + "Sign In" button
3. Enters email: `operator@nostos.com`
4. Clicks "Sign In"
   - Button shows loading state: "Signing in..."
   - Email field disabled
5. **Success:**
   - Toast: "Check your email for a signin link"
   - Email field clears
   - Can submit again
6. **Error (401):**
   - Toast: "Email not authorized to access console"
   - Email field re-enabled, focus restored
7. **Error (429 rate limit):**
   - Toast: "Too many attempts. Try again in 1 hour."
   - Disable form for 1 hour (or show countdown)

**Form Validation (Client-Side):**
- Email: Required, valid format (basic regex or use email input type)
- On blur: Show "Invalid email" error
- On input: Clear error (real-time feedback)

**Component Structure:**
```jsx
<ConsoleSigninPage>
  <ConsoleSigninForm
    onSubmit={handleSignin}
    isLoading={isLoading}
    error={error}
  />
</ConsoleSigninPage>
```

---

### 1.2 Dashboard (After Signin)

**URL:** `/console/dashboard`

**Wireframe:**
```
┌────────────────────────────────────────┐
│ NOSTOS OPERATOR CONSOLE               │
│ [Dashboard] [Households]  [Settings]  │
├────────────────────────────────────────┤
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ NEW HOUSEHOLD                   │  │
│  └─────────────────────────────────┘  │
│                                        │
│  Metrics:                              │
│  ┌──────────────┬─────────────────┐   │
│  │ Households   │  42             │   │
│  │ Members      │  234            │   │
│  │ New (week)   │  5              │   │
│  │ Pending      │  2              │   │
│  └──────────────┴─────────────────┘   │
│                                        │
│  ┌──────────────┬─────────────────┐   │
│  │ Active (7d)  │  189            │   │
│  │ Failed 24h   │  3              │   │
│  │ Email Errors │  0              │   │
│  └──────────────┴─────────────────┘   │
│                                        │
│  Updated 2 minutes ago                 │
│                                        │
└────────────────────────────────────────┘
```

**UX Flow:**
1. Operator signs in → redirected to `/console/dashboard`
2. See metrics cards (read-only, auto-refresh every 5 min)
3. See "New Household" button (prominent, blue CTA)
4. Click → opens create form (modal or new page)

**Metrics Cards:**
- Display in a 2x3 grid (or responsive layout on mobile)
- Show number + label
- Auto-refresh: Fade/pulse animation on update
- Timestamp: "Updated X minutes ago"
- No drill-down links yet (Phase 2)

**Component Structure:**
```jsx
<ConsoleDashboard>
  <MetricsGrid
    households={42}
    members={234}
    newThisWeek={5}
    pendingDeletion={2}
    active7d={189}
    failedSignins={3}
    failedEmails={0}
    lastUpdated={date}
  />
  <CreateHouseholdButton onClick={openModal} />
</ConsoleDashboard>
```

---

### 1.3 Create Household Flow (Modal or New Page)

**URL:** `/console/households/new` or modal on dashboard

**Wireframe (Modal):**
```
┌─────────────────────────────────────┐
│ NEW HOUSEHOLD                      X │
├─────────────────────────────────────┤
│                                     │
│ Household Name *                    │
│ ┌──────────────────────────────┐   │
│ │ e.g., "Adios Family"         │   │
│ └──────────────────────────────┘   │
│ Max 100 characters                  │
│                                     │
│ Admin Email *                       │
│ ┌──────────────────────────────┐   │
│ │ e.g., javier@adios.com       │   │
│ └──────────────────────────────┘   │
│                                     │
│ Admin Name *                        │
│ ┌──────────────────────────────┐   │
│ │ e.g., "Javier"              │   │
│ └──────────────────────────────┘   │
│ Max 50 characters                   │
│                                     │
│ Notes (optional)                    │
│ ┌──────────────────────────────┐   │
│ │ e.g., "Early adopter"        │   │
│ └──────────────────────────────┘   │
│                                     │
│    [ Cancel ]  [ Create ]           │
│                                     │
└─────────────────────────────────────┘
```

**UX Flow:**
1. Operator clicks "New Household"
2. Modal/page opens with form
3. Fields with placeholders + helper text
4. Real-time validation:
   - Household name: Show character count, error if duplicate
   - Email: Show "Invalid email" on blur
   - Admin name: Show error if empty/too long
5. Submit button: "Create" (disabled until valid)
6. On click:
   - Button shows loading: "Creating..."
   - Form fields disabled
7. **Success:**
   - Toast: "Household created. Invite sent to [email]."
   - Modal closes
   - Refresh household list
   - (Optional) Navigate to new household detail page
8. **Error (409 duplicate):**
   - Toast: "Household name already in use. Try a different name."
   - Focus on household name field
9. **Error (409 email in use):**
   - Toast: "Email already registered as admin."
   - Focus on email field

**Form Validation (Client-Side):**
```
household_name:
  ✓ Required (show error if empty)
  ✓ 1-100 chars (show character count)
  ✓ No leading/trailing spaces (trim on blur)
  ✓ Allowed chars: Letters, numbers, spaces, hyphens, apostrophes

admin_email:
  ✓ Required
  ✓ Valid email format (use email input type or regex)
  ✓ Lowercase on blur

admin_name:
  ✓ Required
  ✓ 1-50 chars
  ✓ Letters, spaces, hyphens, apostrophes only
```

**Component Structure:**
```jsx
<CreateHouseholdModal
  isOpen={isOpen}
  onClose={handleClose}
  onSubmit={handleCreate}
  isLoading={isLoading}
  error={error}
/>
```

---

### 1.4 Households List Page

**URL:** `/console/households`

**Wireframe:**
```
┌────────────────────────────────────────────────┐
│ HOUSEHOLDS                    [ Search... ]    │
├────────────────────────────────────────────────┤
│ Name        | Admin Name | Created  | Members  │
├────────────────────────────────────────────────┤
│ Adios       | Javier     | Jul 15   | 4        │
│ Family      |            |          |          │
├────────────────────────────────────────────────┤
│ Smith       | John       | Jul 10   | 3        │
│ Household   |            |          |          │
│ (Deletion   |            |          |          │
│  Pending)   |            |          |          │
├────────────────────────────────────────────────┤
│ [< Previous] Page 1 of 7  [Next >]             │
└────────────────────────────────────────────────┘
```

**UX Features:**
1. **Search Bar:**
   - Debounced search (300ms)
   - Search by: Household name, Admin email
   - Live filter (no submit button needed)

2. **Sorting:**
   - Click column header to sort
   - Show sort indicator (↑/↓)
   - Default: Sort by created_at DESC (newest first)

3. **Pagination:**
   - Show "Page X of Y"
   - Previous/Next buttons
   - Jump to page (optional, Phase 2)

4. **Status Badge:**
   - Active households: No badge (or green "Active")
   - Deletion pending: Yellow/orange "Deletion Pending" badge

5. **Row Click:**
   - Click row → navigate to `/console/households/:id`

6. **Empty State:**
   - If no households: "No households yet. Create one to get started."
   - Link to create form

**Component Structure:**
```jsx
<HouseholdsPage>
  <SearchBar 
    value={search}
    onChange={handleSearch}
    placeholder="Search by name or email..."
  />
  <HouseholdTable
    households={households}
    isLoading={isLoading}
    onSort={handleSort}
    onRowClick={handleSelectHousehold}
  />
  <Pagination
    page={page}
    totalPages={totalPages}
    onPreviousPage={handlePreviousPage}
    onNextPage={handleNextPage}
  />
</HouseholdsPage>
```

---

### 1.5 Household Detail Page

**URL:** `/console/households/:id`

**Wireframe:**
```
┌───────────────────────────────────────────────────┐
│ < Back                                            │
│                                                   │
│ ADIOS FAMILY                                      │
│ Status: Active                                    │
│ Created: July 15, 2026                           │
│                                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ ADMIN                                       │ │
│ │ Name: Javier                                │ │
│ │ Email: javier@adios.com                     │ │
│ │ Status: Claimed ✓                           │ │
│ │ Last Login: July 30, 2:15 PM                │ │
│ └─────────────────────────────────────────────┘ │
│                                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ MEMBERS (4)                                 │ │
│ │ Sofia | sofia@adios.com | Joined Jul 16     │ │
│ │ Kids  | kids@adios.com  | Joined Jul 16     │ │
│ │ Dad   | dad@adios.com   | Joined Jul 17     │ │
│ └─────────────────────────────────────────────┘ │
│                                                   │
│ ┌──────────────────────┐  ┌────────────────────┐│
│ │ [Delete Household]   │  │ [Resend Invite]    ││
│ │ (red, destructive)   │  │ (gray, secondary)  ││
│ └──────────────────────┘  └────────────────────┘│
│                                                   │
└───────────────────────────────────────────────────┘
```

**UX Flow:**
1. Click household in list → land on detail page
2. See household info + admin info + members list
3. If admin is "Pending", see:
   - Status: "Pending Claim"
   - Text: "Invite sent 2 minutes ago. Expires in 47 hours 58 minutes."
   - "Resend Invite" button (blue)
4. If household is "Active":
   - "Delete Household" button (red, destructive)
5. If household is "Deletion Pending":
   - Status: "Deletion Pending"
   - Text: "Will be deleted on August 30, 2026"
   - "Restore" button (blue)
   - "Delete Household" button hidden/disabled

**Buttons:**
- **Resend Invite:** Only visible if admin status is PENDING_INVITE
  - Click → POST /console/households/:id/admin/resend-invite
  - Toast on success: "Invite resent to [email]. Expires in 48 hours."
  - Toast on error (429): "Can't resend. Last sent 4 hours ago. Try again in 20 hours."
- **Delete Household:** Only visible if status = ACTIVE
  - Click → open confirmation modal
- **Restore:** Only visible if status = DELETION_PENDING AND grace period not expired
  - Click → open confirmation modal

**Breadcrumb:** "Console > Households > [Name]"

**Component Structure:**
```jsx
<HouseholdDetailPage>
  <Breadcrumb />
  <HouseholdInfo household={household} />
  <AdminSection admin={admin} />
  <MembersList members={members} />
  <ActionButtons
    status={household.status}
    adminStatus={admin.claimStatus}
    onDelete={handleDeleteClick}
    onRestore={handleRestoreClick}
    onResendInvite={handleResendInvite}
  />
</HouseholdDetailPage>
```

---

## Section 2: Modal Confirmations

### 2.1 Delete Household Confirmation

**Trigger:** Click "Delete Household" button

**Wireframe:**
```
┌──────────────────────────────────────────┐
│ DELETE HOUSEHOLD?                      X │
├──────────────────────────────────────────┤
│                                          │
│ Are you sure? All data will be           │
│ preserved for 30 days. You can           │
│ restore it if needed.                    │
│                                          │
│ This household will be deleted on:       │
│ August 30, 2026 at midnight UTC          │
│                                          │
│ ☐ I understand this deletion is          │
│   reversible for 30 days                 │
│                                          │
│    [ Cancel ]  [ Delete ]                │
│                                          │
└──────────────────────────────────────────┘
```

**UX Flow:**
1. User sees modal
2. Must check confirmation checkbox to enable Delete button
3. Click "Delete":
   - Button shows loading: "Deleting..."
   - Modal disabled
4. **Success:**
   - Modal closes
   - Toast: "Household marked for deletion. Will be deleted on August 30."
   - Redirect to household list OR update household detail page
5. **Error:**
   - Toast: Error message (e.g., "Household is already marked for deletion")
   - Modal remains open

**Component Structure:**
```jsx
<DeleteHouseholdModal
  householdName={name}
  scheduledDeletionDate={date}
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  isLoading={isLoading}
  error={error}
/>
```

---

### 2.2 Restore Household Confirmation

**Trigger:** Click "Restore" button (on deletion-pending household)

**Wireframe:**
```
┌──────────────────────────────────────────┐
│ RESTORE HOUSEHOLD?                     X │
├──────────────────────────────────────────┤
│                                          │
│ Restore this household? All members      │
│ will regain access.                      │
│                                          │
│ Grace period expires on:                 │
│ August 30, 2026 at midnight UTC          │
│                                          │
│    [ Cancel ]  [ Restore ]               │
│                                          │
└──────────────────────────────────────────┘
```

**UX Flow:**
1. User sees modal (no checkbox needed for restore)
2. Click "Restore":
   - Button shows loading: "Restoring..."
3. **Success:**
   - Modal closes
   - Toast: "Household restored successfully"
   - Redirect to household list OR update household detail page
4. **Error:**
   - Toast: Error message (e.g., "Grace period expired. Cannot restore household.")

**Component Structure:**
```jsx
<RestoreHouseholdModal
  householdName={name}
  graceExpiryDate={date}
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  isLoading={isLoading}
  error={error}
/>
```

---

## Section 3: Error States & Toast Notifications

### 3.1 Error Messages (User-Facing)

| Scenario | Error Toast | Recovery |
|----------|-------------|----------|
| **Email not authorized** | "Email not authorized to access console" | Try different email or contact support |
| **Signin link expired** | "Link expired. Request new signin link." | Go back to signin page |
| **Signin link used twice** | "Link already used. Try signing in again." | Go back to signin page |
| **Household name in use** | "Household name already in use. Try a different name." | Edit field, try again |
| **Admin email already in system** | "Email already registered as admin." | Use different email or contact admin |
| **Invalid email format** | "Invalid email format. Check and try again." | Edit field |
| **Resend rate limit hit** | "Can't resend. Last sent 4 hours ago. Try again in 20 hours." | Wait or contact support |
| **Household marked for deletion already** | "This household is already marked for deletion." | Show detail page with restoration option |
| **Grace period expired** | "Grace period expired. Cannot restore household." | Show detail page, dismiss |
| **Network error** | "Network error. Please try again." | Retry action |
| **Server error (500)** | "Something went wrong. Please try again later." | Retry or contact support |

**Toast Component:**
```jsx
<Toast
  type="error" | "success" | "info"
  message="Human-readable message"
  duration={3000} // Auto-dismiss after 3s
  onDismiss={handleDismiss}
/>
```

---

## Section 4: Loading & Skeleton States

### 4.1 Loading States

**Signin Button:**
- Text: "Signing in..."
- Disabled
- Show spinner/loader icon

**Create Form Submit:**
- Text: "Creating..."
- Disabled
- All fields disabled

**Household List:**
- Show skeleton rows (5-10) while loading
- Each row: Shimmer animation

**Household Detail:**
- Show skeleton boxes for sections
- Skeleton text blocks

**Component Structure:**
```jsx
// Skeleton loader
<SkeletonTable rows={10} columns={5} />
<SkeletonCard height="200px" />

// Form loading state
<button disabled>
  {isLoading && <Spinner />}
  {isLoading ? 'Creating...' : 'Create'}
</button>
```

---

## Section 5: Component Library & Patterns

### 5.1 Reusable Components Needed

```
Core UI:
├── Button (primary, secondary, danger)
├── Input (text, email, textarea)
├── Modal / Dialog
├── Toast / Alert
├── Table (with sorting)
├── Pagination
├── Badge (status)
├── SearchBar
├── Loading Spinner
├── Skeleton Loaders
└── Breadcrumb

Console-Specific:
├── ConsoleSigninForm
├── CreateHouseholdForm
├── HouseholdTable
├── HouseholdDetail
├── MetricsGrid
├── DeleteHouseholdModal
├── RestoreHouseholdModal
└── OperatorNav
```

### 5.2 Design Tokens

**Colors:**
```
Primary: #007AFF (blue, CTAs)
Danger: #FF3B30 (red, delete)
Success: #34C759 (green, success toasts)
Warning: #FF9500 (orange, deletion pending badge)
Neutral: #8E8E93 (grays)
Background: #F2F2F7 (light gray)
Text: #000000 (primary), #8E8E93 (secondary)
```

**Typography:**
```
Heading 1: 28px, bold
Heading 2: 22px, semibold
Body: 16px, regular
Caption: 13px, regular (light gray)
```

**Spacing:**
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
```

---

## Section 6: Form Specifications

### 6.1 Create Household Form

**Fields:**
```
household_name
  Type: text
  Placeholder: "e.g., Adios Family"
  Required: true
  Max length: 100
  Helper text: "Max 100 characters"
  Error message: "Household name already in use" OR "Required field"
  
admin_email
  Type: email
  Placeholder: "e.g., javier@adios.com"
  Required: true
  Max length: 254
  Error message: "Invalid email" OR "Already registered"
  
admin_name
  Type: text
  Placeholder: "e.g., Javier"
  Required: true
  Max length: 50
  Helper text: "Max 50 characters"
  Error message: "Required field"
  
notes (optional)
  Type: textarea
  Placeholder: "e.g., Early adopter, VIP tier"
  Max length: 500
  Helper text: "Max 500 characters (optional)"
```

**Validation (Client-Side):**
- On blur: Validate field (show error if invalid)
- On input: Clear error (real-time feedback)
- On submit: Validate all fields, disable button until valid

**Component:**
```jsx
<CreateHouseholdForm
  onSubmit={handleSubmit}
  isLoading={isLoading}
  initialError={error}
/>
```

---

### 6.2 Signin Form

**Fields:**
```
email
  Type: email
  Placeholder: "your email address"
  Required: true
  Autocomplete: email
  Error message: "Invalid email"
```

**Validation:**
- On blur: Validate email format
- On submit: Validate, send signin request

**Component:**
```jsx
<ConsoleSigninForm
  onSubmit={handleSubmit}
  isLoading={isLoading}
  error={error}
/>
```

---

## Section 7: Navigation & Routing

**Route Structure:**
```
/console/signin
  └── ConsoleSigninPage

/console/dashboard
  └── ConsoleDashboard
      ├── MetricsGrid
      ├── CreateHouseholdModal
      └── QuickActions

/console/households
  └── HouseholdsPage
      ├── SearchBar
      ├── HouseholdTable
      └── Pagination

/console/households/:id
  └── HouseholdDetailPage
      ├── HouseholdInfo
      ├── AdminSection
      ├── MembersList
      ├── DeleteHouseholdModal
      ├── RestoreHouseholdModal
      └── ResendInviteAction
```

**Guards:**
- `/console/*` → Requires authenticated operator
- Redirect unauthenticated to `/console/signin`
- Redirect signed-in user accessing `/console/signin` to `/console/dashboard`

---

## Section 8: Data Fetching (TanStack Query)

### 8.1 Queries

```javascript
// Signin (POST, not a query, but mutation)
useMutation({
  mutationFn: (email) => api.post('/console/auth/signin', { email }),
  onSuccess: () => {
    toast.success('Check your email for a signin link');
    reset();
  },
  onError: (error) => {
    toast.error(error.message);
  }
});

// Dashboard metrics
useQuery({
  queryKey: ['console', 'metrics'],
  queryFn: () => api.get('/console/dashboard/metrics'),
  refetchInterval: 5 * 60 * 1000, // 5 minutes
  staleTime: 1 * 60 * 1000 // 1 minute
});

// Households list
useQuery({
  queryKey: ['console', 'households', { page, search, sort }],
  queryFn: () => api.get('/console/households', { 
    params: { page, search, sort }
  }),
  keepPreviousData: true
});

// Household detail
useQuery({
  queryKey: ['console', 'households', id],
  queryFn: () => api.get(`/console/households/${id}`),
  enabled: !!id
});

// Create household
useMutation({
  mutationFn: (data) => api.post('/console/households', data),
  onSuccess: (response) => {
    queryClient.invalidateQueries(['console', 'households']);
    toast.success(`Household created. Invite sent to ${data.admin_email}`);
    onClose();
  },
  onError: (error) => {
    toast.error(error.message);
  }
});

// Delete household
useMutation({
  mutationFn: (householdId) => 
    api.post(`/console/households/${householdId}/delete`, { 
      confirmation: 'DELETE' 
    }),
  onSuccess: (response) => {
    queryClient.invalidateQueries(['console', 'households']);
    navigate('/console/households');
    toast.success(`Household marked for deletion. Will delete on ${response.scheduled_deletion_date}`);
  },
  onError: (error) => {
    toast.error(error.message);
  }
});

// Restore household
useMutation({
  mutationFn: (householdId) => 
    api.post(`/console/households/${householdId}/restore`, {}),
  onSuccess: () => {
    queryClient.invalidateQueries(['console', 'households']);
    toast.success('Household restored successfully');
  },
  onError: (error) => {
    toast.error(error.message);
  }
});

// Resend invite
useMutation({
  mutationFn: (householdId) => 
    api.post(`/console/households/${householdId}/admin/resend-invite`, {}),
  onSuccess: () => {
    queryClient.invalidateQueries(['console', 'households', id]);
    toast.success('Invite resent. Expires in 48 hours');
  },
  onError: (error) => {
    if (error.status === 429) {
      toast.error(error.message); // "Can't resend. Last sent X hours ago..."
    } else {
      toast.error(error.message);
    }
  }
});
```

---

## Section 9: Responsive Design

### 9.1 Breakpoints

```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

### 9.2 Layout Changes

**Signin Page:** Full-width on all devices

**Dashboard:**
- Desktop: 2x3 metrics grid
- Tablet: 2x3 metrics grid
- Mobile: 1 column (stack vertically)

**Household Table:**
- Desktop: Full table with all columns
- Tablet: Hide "Admin Email" column
- Mobile: Show only Name, Status. Add "swipe right for actions" hint

**Household Detail:**
- Desktop: Side-by-side layout (info + members)
- Tablet: Stacked layout
- Mobile: Stacked layout, buttons stack

---

## Section 10: Accessibility (A11y)

- **ARIA labels** on all buttons + form fields
- **Keyboard navigation** (Tab, Enter, Escape in modals)
- **Focus management** (focus trapped in modals, restore focus on close)
- **Color contrast** (WCAG AA minimum)
- **Error messages** linked to fields (aria-describedby)
- **Loading states** announced to screen readers

**Example:**
```jsx
<input
  type="email"
  aria-label="Email address"
  aria-describedby="email-error"
  aria-required="true"
/>
{error && <div id="email-error">{error}</div>}
```

---

## Section 11: Performance Considerations

- **Lazy load household list** (infinite scroll or pagination, not all at once)
- **Debounce search** (300ms) to reduce API calls
- **Memoize components** (React.memo) for metrics cards, form inputs
- **Code splitting** (route-based splitting for /console routes)
- **Image optimization** (if any logos/icons, use SVG or optimized PNG)

---

## Section 12: Testing (Component-Level)

### 12.1 Unit Tests (Vitest)

```javascript
describe('CreateHouseholdForm', () => {
  it('should show error if household name in use', async () => {
    render(<CreateHouseholdForm />);
    userEvent.type(screen.getByLabelText(/household name/i), 'Existing Name');
    userEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(screen.getByText(/already in use/i)).toBeInTheDocument();
    });
  });

  it('should disable submit until all required fields filled', () => {
    render(<CreateHouseholdForm />);
    const submitButton = screen.getByText('Create');
    expect(submitButton).toBeDisabled();
    
    userEvent.type(screen.getByLabelText(/household name/i), 'New House');
    expect(submitButton).toBeDisabled(); // Still missing email + name
    
    userEvent.type(screen.getByLabelText(/admin email/i), 'test@test.com');
    userEvent.type(screen.getByLabelText(/admin name/i), 'John');
    expect(submitButton).toBeEnabled();
  });
});
```

### 12.2 Integration Tests (React Testing Library)

```javascript
describe('Household Detail Flow', () => {
  it('should delete household with confirmation', async () => {
    render(<HouseholdDetailPage householdId="123" />);
    
    userEvent.click(screen.getByText('Delete Household'));
    
    // Modal should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Checkbox should disable button initially
    const deleteBtn = screen.getByText('Delete', { selector: 'button' });
    expect(deleteBtn).toBeDisabled();
    
    userEvent.click(screen.getByRole('checkbox'));
    expect(deleteBtn).toBeEnabled();
    
    userEvent.click(deleteBtn);
    
    // Success toast
    await waitFor(() => {
      expect(screen.getByText(/marked for deletion/i)).toBeInTheDocument();
    });
  });
});
```

---

## Section 13: Deployment Checklist

- [ ] All pages built + routed
- [ ] Forms validate (client-side + server errors)
- [ ] All modals working (delete, restore)
- [ ] All error toasts showing correct messages
- [ ] Loading states on all buttons + pages
- [ ] Search/sort/pagination working
- [ ] Responsive layout tested (mobile, tablet, desktop)
- [ ] Accessibility audit passed (axe, keyboard nav)
- [ ] Authentication guard blocking unauthorized access
- [ ] Dark mode support (if needed)
- [ ] E2E tests (Playwright or Cypress)

---

## Sign-Off

**Frontend Owner:** [Name]  
**Status:** Ready for Implementation  
**Backend Counterpart:** PRD-Authentication-Console-BE.md  
**Master Reference:** PRD-Authentication-Console-MASTER.md
