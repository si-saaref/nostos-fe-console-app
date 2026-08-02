import { useForm } from 'react-hook-form'
import { useCreateHousehold } from '../api/useCreateHousehold'
import type { CreateHouseholdInput } from '../types'

interface CreateHouseholdFormProps {
  onSuccess: (householdId: string) => void
}

export function CreateHouseholdForm({ onSuccess }: CreateHouseholdFormProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<CreateHouseholdInput>({
    mode: 'onBlur',
    defaultValues: { household_name: '', admin_email: '', admin_name: '', notes: '' },
  })
  const { mutate, isPending, error } = useCreateHousehold()

  const householdName = watch('household_name')
  const nameLength = householdName?.length || 0

  const onSubmit = (data: CreateHouseholdInput) => {
    mutate(data, {
      onSuccess: (response) => {
        onSuccess(response.household_id)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="household_name">Household Name *</label>
        <input
          id="household_name"
          type="text"
          placeholder="e.g., Adios Family"
          maxLength={100}
          disabled={isPending}
          aria-required="true"
          aria-describedby={errors.household_name ? 'household_name-error' : 'household_name-hint'}
          {...register('household_name', {
            required: 'Household name is required',
            minLength: { value: 1, message: 'Household name is required' },
            maxLength: { value: 100, message: 'Max 100 characters' },
            pattern: {
              value: /^[a-zA-Z0-9\s\-']+$/,
              message: 'Only letters, numbers, spaces, hyphens, and apostrophes allowed',
            },
          })}
        />
        <small id="household_name-hint">{nameLength}/100</small>
        {errors.household_name && (
          <span id="household_name-error" role="alert">
            {errors.household_name.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="admin_email">Admin Email *</label>
        <input
          id="admin_email"
          type="email"
          placeholder="e.g., javier@adios.com"
          disabled={isPending}
          aria-required="true"
          aria-describedby={errors.admin_email ? 'admin_email-error' : undefined}
          autoComplete="email"
          {...register('admin_email', {
            required: 'Admin email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format',
            },
          })}
        />
        {errors.admin_email && (
          <span id="admin_email-error" role="alert">
            {errors.admin_email.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="admin_name">Admin Name *</label>
        <input
          id="admin_name"
          type="text"
          placeholder="e.g., Javier"
          maxLength={50}
          disabled={isPending}
          aria-required="true"
          aria-describedby={errors.admin_name ? 'admin_name-error' : undefined}
          {...register('admin_name', {
            required: 'Admin name is required',
            minLength: { value: 1, message: 'Admin name is required' },
            maxLength: { value: 50, message: 'Max 50 characters' },
            pattern: {
              value: /^[a-zA-Z\s\-']+$/,
              message: 'Only letters, spaces, hyphens, and apostrophes allowed',
            },
          })}
        />
        {errors.admin_name && (
          <span id="admin_name-error" role="alert">
            {errors.admin_name.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="notes">Notes (optional)</label>
        <input
          id="notes"
          type="text"
          placeholder="e.g., Early adopter"
          disabled={isPending}
          {...register('notes')}
        />
      </div>

      {error && (
        <div role="alert" aria-live="polite" style={{ color: 'red' }}>
          {(error as Error).message}
        </div>
      )}

      <button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
