import { Notice } from '@/components/Notice'
import { formatEntryDate, graceRemaining } from '../grace'
import { Fact, Facts, Section } from './Facts'
import type { HouseholdCore } from '../types'

/**
 * The household's own facts. The actions that change them live in the dialog
 * footer, where a decision belongs — not scattered through the reading.
 */
export function HouseholdInfo({ household }: { household: HouseholdCore }) {
  const isPending = household.status === 'DELETION_PENDING'
  const grace = isPending ? graceRemaining(household.scheduledDeletionDate) : null

  return (
    <Section title="Household">
      {isPending && (
        <Notice tone={grace?.lapsed ? 'danger' : 'warning'} className="mb-4">
          {grace?.lapsed ? (
            <>
              <strong>The grace period has ended.</strong> This household is queued for permanent
              deletion and can no longer be restored here.
            </>
          ) : (
            <>
              <strong>Scheduled for deletion.</strong>{' '}
              {household.scheduledDeletionDate && (
                <>
                  It will be permanently deleted on{' '}
                  {formatEntryDate(household.scheduledDeletionDate)}
                  {grace && (
                    <>
                      {' '}
                      — {grace.daysRemaining} {grace.daysRemaining === 1 ? 'day' : 'days'} left
                    </>
                  )}
                  .{' '}
                </>
              )}
              Restoring it undoes this completely.
            </>
          )}
        </Notice>
      )}

      <Facts>
        <Fact label="Status">{isPending ? 'Deletion pending' : 'Active'}</Fact>
        <Fact label="Created">{formatEntryDate(household.createdAt)}</Fact>
        {household.deletionRequestedAt && (
          <Fact label="Deletion requested">{formatEntryDate(household.deletionRequestedAt)}</Fact>
        )}
        {household.scheduledDeletionDate && (
          <Fact label="Deletes on" tone={grace?.lapsed ? 'danger' : 'warning'}>
            {formatEntryDate(household.scheduledDeletionDate)}
          </Fact>
        )}
      </Facts>
    </Section>
  )
}
