/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not `tailwind-merge`: nothing here overrides a utility from a
 * prop, so there are no conflicting classes to resolve, and a 4 kB dependency
 * to concatenate strings is not a trade worth making.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
