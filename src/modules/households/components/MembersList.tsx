import type { HouseholdMember } from '../types'

export function MembersList({ members }: { members: HouseholdMember[] }) {
  return (
    <section aria-label="Members">
      <h2>Members ({members.length})</h2>
      {members.length === 0 ? (
        <p>No members.</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              {member.name} | {member.email} | {member.role === 'ADMIN' ? 'Admin' : 'Member'} |
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
