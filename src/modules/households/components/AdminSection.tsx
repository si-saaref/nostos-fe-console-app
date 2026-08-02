import type { HouseholdAdmin } from '../types'

export function AdminSection({ admin }: { admin: HouseholdAdmin }) {
  return (
    <section aria-label="Admin">
      <h2>Admin</h2>
      <p>Name: {admin.name}</p>
      <p>Email: {admin.email}</p>
      <p>Status: {admin.claimStatus === 'CLAIMED' ? 'Claimed' : 'Pending Claim'}</p>
      {admin.lastLoginAt && <p>Last Login: {new Date(admin.lastLoginAt).toLocaleString()}</p>}
    </section>
  )
}
