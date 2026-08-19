import { isAxiosError } from 'axios'

const NETWORK_ERROR_MESSAGE = 'Network error. Please try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again later.'

export function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return GENERIC_ERROR_MESSAGE
  }

  if (!error.response) {
    return NETWORK_ERROR_MESSAGE
  }

  const data = error.response.data as
    | { message?: string; error?: { message?: string } }
    | undefined
  return data?.error?.message ?? data?.message ?? GENERIC_ERROR_MESSAGE
}
