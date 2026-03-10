// src/lib/types/pagination.ts
// =============================================================================
// LUSTRE — Cursor-Based Pagination Types
// =============================================================================

/** Raw key-value payload encoded inside a cursor token. */
export interface CursorPayload {
  [key: string]: string
}

/**
 * Parameters controlling which page to fetch.
 *
 * Pass `after` to move forward (next page), `before` to move backward
 * (previous page).  Omit both to fetch the first page.
 */
export interface PaginationParams {
  /** Opaque base64url cursor — fetch records that come AFTER this position. */
  after?: string
  /** Opaque base64url cursor — fetch records that come BEFORE this position. */
  before?: string
  /** Records per page.  Defaults to 25, capped at 100. */
  limit?: number
}

/** Wrapper returned by all paginated query functions. */
export interface PaginatedResult<T> {
  data: T[]
  /** Pass as `after` to fetch the next page.  null when on the last page. */
  nextCursor: string | null
  /** Pass as `before` to fetch the previous page.  null when on the first page. */
  prevCursor: string | null
  hasNextPage: boolean
  hasPrevPage: boolean
}
