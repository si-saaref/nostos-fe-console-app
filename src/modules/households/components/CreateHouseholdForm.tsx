import { useForm } from 'react-hook-form'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { toApiError } from '@/utils/responseHandlers'
import { useCreateHousehold } from '../api/useCreateHousehold'
import { toCreateFormField } from '../api/wire'
import type { CreateHouseholdInput } from '../types'

interface CreateHouseholdFormProps {
  onSuccess: (householdId: string) => void
}

export function CreateHouseholdForm({ onSuccess }: CreateHouseholdFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm<CreateHouseholdInput>({
    mode: 'onBlur',
    defaultValues: { householdName: '', adminEmail: '', adminName: '', notes: '' },
  })
  const { mutate, isPending, error } = useCreateHousehold()

  const householdName = watch('householdName')
  const nameLength = householdName?.length || 0

  const onSubmit = (data: CreateHouseholdInput) => {
    mutate(data, {
      onSuccess: (created) => {
        onSuccess(created.householdId)
      },
      onError: (mutationError) => {
        // A 400 from the validation pipe names the offending fields; put each
        // message on its own input rather than only in the form-level alert.
        const apiError = toApiError(mutationError)
        if (!apiError) return
        for (const fieldError of apiError.fieldErrors) {
          const field = toCreateFormField(fieldError.field)
          if (field) setError(field, { type: fieldError.code, message: fieldError.message })
        }
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="householdName">Household Name *</label>
        <input
          id="householdName"
          type="text"
          placeholder="e.g., Adios Family"
          maxLength={100}
          disabled={isPending}
          aria-required="true"
          aria-describedby={errors.householdName ? 'householdName-error' : 'householdName-hint'}
          {...register('householdName', {
            required: 'Household name is required',
            minLength: { value: 1, message: 'Household name is required' },
            maxLength: { value: 100, message: 'Max 100 characters' },
            pattern: {
              value: /^[a-zA-Z0-9\s\-']+$/,
              message: 'Only letters, numbers, spaces, hyphens, and apostrophes allowed',
            },
          })}
        />
        <small id="householdName-hint">{nameLength}/100</small>
        {errors.householdName && (
          <span id="householdName-error" role="alert">
            {errors.householdName.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="adminEmail">Admin Email *</label>
        <input
          id="adminEmail"
          type="email"
          placeholder="e.g., javier@adios.com"
          disabled={isPending}
          aria-required="true"
          aria-describedby={errors.adminEmail ? 'adminEmail-error' : undefined}
          autoComplete="email"
          {...register('adminEmail', {
            required: 'Admin email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format',
            },
          })}
        />
        {errors.adminEmail && (
          <span id="adminEmail-error" role="alert">
            {errors.adminEmail.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="adminName">Admin Name *</label>
        <input
          id="adminName"
          type="text"
          placeholder="e.g., Javier"
          maxLength={50}
          disabled={isPending}
          aria-required="true"
          aria-describedby={errors.adminName ? 'adminName-error' : undefined}
          {...register('adminName', {
            required: 'Admin name is required',
            minLength: { value: 1, message: 'Admin name is required' },
            maxLength: { value: 50, message: 'Max 50 characters' },
            pattern: {
              value: /^[a-zA-Z\s\-']+$/,
              message: 'Only letters, spaces, hyphens, and apostrophes allowed',
            },
          })}
        />
        {errors.adminName && (
          <span id="adminName-error" role="alert">
            {errors.adminName.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="notes">Notes (optional)</label>
        <input
          id="notes"
          type="text"
          placeholder="e.g., Early adopter"
          maxLength={1000}
          disabled={isPending}
          {...register('notes', { maxLength: { value: 1000, message: 'Max 1000 characters' } })}
        />
        {errors.notes && (
          <span id="notes-error" role="alert">
            {errors.notes.message}
          </span>
        )}
      </div>

      {error && (
        <div role="alert" aria-live="polite" style={{ color: 'red' }}>
          {getErrorMessage(error)}
        </div>
      )}

      <button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
