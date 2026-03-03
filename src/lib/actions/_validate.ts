// src/lib/actions/_validate.ts
// =============================================================================
// LUSTRE — Server-action input validation helpers
//
// Usage:
//   const name = str(formData, 'first_name', 100)          // trimmed or null
//   const name = requiredStr(formData, 'first_name', 100)  // throws if empty
// =============================================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/** Trim a FormData string field. Throws if it exceeds maxLen. Returns null if empty. */
export function str(formData: FormData, field: string, maxLen: number): string | null {
  const raw = formData.get(field)
  if (raw === null || raw === '') return null
  const s = String(raw).trim()
  if (s.length > maxLen)
    throw new ValidationError(`${field.replace(/_/g, ' ')} must be ${maxLen} characters or fewer.`)
  return s || null
}

/** Like str(), but throws if the result is empty. */
export function requiredStr(formData: FormData, field: string, maxLen: number): string {
  const s = str(formData, field, maxLen)
  if (!s) throw new ValidationError(`${field.replace(/_/g, ' ')} is required.`)
  return s
}
