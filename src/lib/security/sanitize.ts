/**
 * Input sanitization utilities to prevent XSS, injection attacks, and data corruption.
 */

/**
 * Strip HTML tags from a string to prevent XSS.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

/**
 * Sanitize a string input: strip HTML, trim, limit length.
 */
export function sanitizeString(input: unknown, maxLength: number = 5000): string {
  if (typeof input !== 'string') return ''
  return stripHtml(input).substring(0, maxLength)
}

/**
 * Sanitize a numeric input.
 */
export function sanitizeNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === '') return null
  const num = Number(input)
  if (isNaN(num) || !isFinite(num)) return null
  return num
}

/**
 * Sanitize an object's string fields.
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  stringFields: string[],
  numberFields: string[] = []
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj }
  for (const field of stringFields) {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      result[field] = sanitizeString(result[field])
    }
  }
  for (const field of numberFields) {
    if (field in result && result[field] !== null && result[field] !== undefined) {
      result[field] = sanitizeNumber(result[field])
    }
  }
  return result
}

/**
 * Validate that a value is one of allowed options (for enum fields).
 */
export function validateEnum<T extends string>(value: unknown, allowed: T[]): T | null {
  if (typeof value !== 'string') return null
  return allowed.includes(value as T) ? (value as T) : null
}
