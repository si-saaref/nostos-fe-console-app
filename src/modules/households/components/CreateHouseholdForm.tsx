import { useForm } from 'react-hook-form'
import { Field, Input } from '@/components/Field'
import { Notice } from '@/components/Notice'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { toApiError } from '@/utils/responseHandlers'
import { useCreateHousehold } from '../api/useCreateHousehold'
import { toCreateFormField } from '../api/wire'
import type { CreateHouseholdInput, CreatedHousehold } from '../types'

interface CreateHouseholdFormProps {
  /** The form's `id`, so a submit button outside it can drive it. */
  formId: string
  onSuccess: (created: CreatedHousehold) => void
  onPendingChange?: (isPending: boolean) => void
}

export function CreateHouseholdForm({
  formId,
  onSuccess,
  onPendingChange,
}: CreateHouseholdFormProps) {
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

  const nameLength = watch('householdName')?.length || 0

  const onSubmit = (data: CreateHouseholdInput) => {
    onPendingChange?.(true)
    mutate(data, {
      onSuccess: (created) => {
        onPendingChange?.(false)
        onSuccess(created)
      },
      onError: (mutationError) => {
        onPendingChange?.(false)
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
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Field
        htmlFor="householdName"
        label="Household Name"
        required
        hint={`${nameLength}/100`}
        error={errors.householdName?.message}
      >
        <Input
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
      </Field>

      <Field
        htmlFor="adminEmail"
        label="Admin Email"
        required
        hint="The invite goes here. It expires in 48 hours."
        error={errors.adminEmail?.message}
      >
        <Input
          id="adminEmail"
          type="email"
          placeholder="e.g., javier@adios.com"
          disabled={isPending}
          aria-required="true"
          aria-describedby={errors.adminEmail ? 'adminEmail-error' : 'adminEmail-hint'}
          autoComplete="email"
          {...register('adminEmail', {
            required: 'Admin email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format',
            },
          })}
        />
      </Field>

      <Field
        htmlFor="adminName"
        label="Admin Name"
        required
        error={errors.adminName?.message}
      >
        <Input
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
      </Field>

      <Field
        htmlFor="notes"
        label="Notes (optional)"
        hint="Internal only. The household never sees this."
        error={errors.notes?.message}
      >
        <Input
          id="notes"
          type="text"
          placeholder="e.g., Early adopter"
          maxLength={1000}
          disabled={isPending}
          aria-describedby={errors.notes ? 'notes-error' : 'notes-hint'}
          {...register('notes', { maxLength: { value: 1000, message: 'Max 1000 characters' } })}
        />
      </Field>

      {error && (
        <Notice tone="danger" role="alert">
          {getErrorMessage(error)}
        </Notice>
      )}
    </form>
  )
}
