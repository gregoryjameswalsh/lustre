// src/lib/pagination.ts
// =============================================================================
// LUSTRE — Cursor Pagination Helpers
// =============================================================================

import type { CursorPayload, PaginatedResult } from '@/lib/types/pagination'

export const PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

// -----------------------------------------------------------------------------
// Cursor encoding / decoding
// -----------------------------------------------------------------------------

/** Encode a key-value payload into an opaque base64url token. */
export function encodeCursor(payload: CursorPayload): string {
  // btoa produces standard base64; convert to URL-safe base64url (no padding)
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Decode a cursor token back to its payload.
 * Returns null if the token is missing, malformed, or tampered with.
 */
export function decodeCursor(cursor: string | undefined): CursorPayload | null {
  if (!cursor) return null
  try {
    // Restore standard base64 from base64url
    const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/')
    const padded  = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
    const parsed  = JSON.parse(atob(padded))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as CursorPayload
  } catch {
    return null
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Clamp a requested page size to [1, MAX_PAGE_SIZE], defaulting to PAGE_SIZE. */
export function clampLimit(limit: number | undefined): number {
  const n = limit ?? PAGE_SIZE
  return Math.min(Math.max(1, n), MAX_PAGE_SIZE)
}

/**
 * Wrap a PostgREST filter value in double-quotes so special characters
 * (apostrophes, hyphens, spaces, accents) don't break the filter string.
 *
 * Example:  pgVal("O'Brien")  →  `"O'Brien"`
 */
export function pgVal(v: string): string {
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// -----------------------------------------------------------------------------
// Result builder
// -----------------------------------------------------------------------------

/**
 * Build a PaginatedResult<T> from the raw rows returned by a keyset query.
 *
 * Convention: always fetch `limit + 1` rows.  The extra row acts as a sentinel
 * indicating whether another page exists — it is stripped before returning.
 *
 * @param rows        Raw rows from the database (up to limit+1)
 * @param limit       The requested page size
 * @param direction   'forward' when navigating via `after`, 'backward' via `before`
 * @param isFirstPage True when neither `after` nor `before` was provided
 * @param getCursor   Extracts the cursor payload from a row
 */
export function buildPaginatedResult<T>(
  rows: T[],
  limit: number,
  direction: 'forward' | 'backward',
  isFirstPage: boolean,
  getCursor: (row: T) => CursorPayload,
): PaginatedResult<T> {
  const hasMore = rows.length > limit

  // Trim the sentinel row
  let data = rows.slice(0, limit)

  // Backward queries are run in reverse order so the DB can use the index
  // efficiently; flip back to the canonical display order before returning.
  if (direction === 'backward') {
    data = [...data].reverse()
  }

  const firstRow = data[0] ?? null
  const lastRow  = data[data.length - 1] ?? null

  // nextCursor encodes the last visible row → pass as `after` for the next page.
  // prevCursor encodes the first visible row → pass as `before` for the prev page.
  const nextCursor = lastRow  ? encodeCursor(getCursor(lastRow))  : null
  const prevCursor = firstRow ? encodeCursor(getCursor(firstRow)) : null

  // hasNextPage: did the sentinel row appear (more rows in forward direction)?
  // When going backward we know there's a next page because we have a `before`
  // cursor — i.e. we're not on the first page.
  const hasNextPage = direction === 'forward'
    ? hasMore
    : !isFirstPage

  // hasPrevPage: symmetric logic.
  const hasPrevPage = direction === 'backward'
    ? hasMore
    : !isFirstPage

  return {
    data,
    nextCursor: hasNextPage ? nextCursor : null,
    prevCursor: hasPrevPage ? prevCursor : null,
    hasNextPage,
    hasPrevPage,
  }
}
