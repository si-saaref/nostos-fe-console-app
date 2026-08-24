import { formatEntryDate } from '../grace'
import { Section } from './Facts'
import type { HouseholdMember } from '../types'

/**
 * Every member, not a truncated preview — twelve is the typical upper end and
 * the dialog body scrolls, so there is no reason to hide any of them.
 */
export function MembersList({ members }: { members: HouseholdMember[] }) {
  return (
    <Section title={`Members (${members.length})`}>
      {members.length === 0 ? (
        <p className="text-md text-ink-2">No members.</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {members.map((member) => (
            <li key={member.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <span className="block truncate text-md text-ink">{member.name}</span>
                <span className="block truncate text-sm text-ink-3" title={member.email}>
                  {member.email}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <span className="block text-sm text-ink-2">
                  {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                </span>
                <span className="block text-xs text-ink-3 tabular-nums">
                  Joined {formatEntryDate(member.joinedAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
