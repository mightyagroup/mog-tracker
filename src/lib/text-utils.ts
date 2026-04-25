// UTF-8 sanity helpers used across the platform.
//
// Two real-world encoding problems that bit us repeatedly:
//
//   1. Mojibake: text that was already correct UTF-8 got re-decoded as
//      Latin-1, producing 'â€"' for em-dash, 'â€™' for right-single-quote,
//      'Â ' for non-breaking space, etc. We strip these before persisting.
//
//   2. Smart-quote leakage from PDF/DOCX parsers: curly quotes, em dashes,
//      and Microsoft Word's special punctuation render fine in Drive but
//      look ugly in plain-text contexts. We normalize to ASCII when the
//      target context expects plain text.

const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  // Triple-byte mojibake of em/en dash (U+2014, U+2013)
  [/â€"/g, '—'],
  [/â€"/g, '–'],
  // Right single quote (U+2019)
  [/â€™/g, "'"],
  // Left single quote (U+2018)
  [/â€˜/g, "'"],
  // Curly double quotes (U+201C, U+201D)
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  // Bullet (U+2022) and ellipsis (U+2026)
  [/â€¢/g, '•'],
  [/â€¦/g, '…'],
  // Trademark, registered (U+2122, U+00AE)
  [/â„¢/g, '™'],
  [/Â®/g, '®'],
  // Non-breaking space mojibake — usually appears as 'Â ' (ascii space)
  // or 'Â ' (real NBSP). Replace both with a regular space.
  [/Â /g, ' '],
  [/Â (?=\S)/g, ' '],
  [/Â$/gm, ''],
  // Final orphan 'Â' that doesn't fit any pattern above
  [/Â(?=[-¿])/g, ''],
]

/**
 * Strip mojibake byte sequences and normalize whitespace.
 * Safe to call on any string. Idempotent.
 */
export function fixMojibake(input: string | null | undefined): string {
  if (input == null) return ''
  let s = String(input)
  for (const [pat, rep] of MOJIBAKE_MAP) s = s.replace(pat, rep)
  // Collapse leftover replacement characters (U+FFFD) to a space
  s = s.replace(/�/g, ' ')
  // Normalize CRLF and LS/PS to single newlines
  s = s.replace(/\r\n/g, '\n').replace(/[\u2028\u2029]/g, '\n')
  return s
}

/**
 * Apply fixMojibake to all string values in a JSON-serializable object.
 * Used after parsing external API responses (USASpending, SAM.gov, etc.)
 * before writing to Supabase.
 */
export function fixMojibakeDeep<T>(value: T): T {
  if (value == null) return value
  if (typeof value === 'string') return fixMojibake(value) as unknown as T
  if (Array.isArray(value)) return value.map(fixMojibakeDeep) as unknown as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = fixMojibakeDeep(v)
    }
    return out as unknown as T
  }
  return value
}

/**
 * Convert smart punctuation to ASCII equivalents.
 * Use ONLY when the target is a plain-text context (CSV cell, terminal
 * output, file name). Don't use for prose that will display in HTML —
 * em dashes look better than hyphens in user-facing copy.
 */
export function smartToAscii(input: string | null | undefined): string {
  if (input == null) return ''
  return String(input)
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '*')
    .replace(/ /g, ' ')
}
