'use server'

// src/lib/actions/activities-paginated.ts
// =============================================================================
// LUSTRE — Server action: Load More activities for the timeline component
// =============================================================================

import { getClientActivities } from '@/lib/queries/activities'
import type { Activity } from '@/lib/types'
import type { PaginatedResult } from '@/lib/types/pagination'

/**
 * Fetch the next page of activities for a client timeline.
 * Called by the ActivityTimeline client component when the user clicks Load More.
 *
 * @param clientId  The client whose activities to fetch
 * @param after     The cursor returned as `nextCursor` from the previous page
 */
export async function loadMoreActivities(
  clientId: string,
  after: string,
): Promise<PaginatedResult<Activity>> {
  return getClientActivities(clientId, { after })
}
