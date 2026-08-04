import type { HouseholdMember } from '../types'

export function MembersList({ members }: { members: HouseholdMember[] }) {
  return (
    <section aria-label="Members">
      <h2>Members ({members.length})</h2>
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            {member.name} | {member.email} | Joined {new Date(member.joinedAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </section>
  )
}
