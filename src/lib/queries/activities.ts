import { createClient } from '@/lib/supabase/server'
import { clampLimit, buildPaginatedResult, decodeCursor, pgVal } from '@/lib/pagination'
import type { Activity, FollowUp } from '@/lib/types'
import type { PaginationParams, PaginatedResult } from '@/lib/types/pagination'

async function getOrgId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organisation_id) throw new Error('No organisation found')
  return profile.organisation_id
}

export async function getClientActivities(
  clientId: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<Activity>> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const limit       = clampLimit(pagination?.limit)
  const isFirstPage = !pagination?.after && !pagination?.before
  const direction   = pagination?.before ? 'backward' : 'forward'

  let query = supabase
    .from('activities')
    .select(`
      *,
      profiles (full_name, email)
    `)
    .eq('client_id', clientId)
    .eq('organisation_id', orgId)
    .limit(limit + 1)

  if (pagination?.after) {
    const cursor = decodeCursor(pagination.after)
    if (cursor) {
      query = query.or(
        `created_at.lt.${pgVal(cursor.created_at)},and(created_at.eq.${pgVal(cursor.created_at)},id.lt.${pgVal(cursor.id)})`
      )
    }
  } else if (pagination?.before) {
    const cursor = decodeCursor(pagination.before)
    if (cursor) {
      query = query.or(
        `created_at.gt.${pgVal(cursor.created_at)},and(created_at.eq.${pgVal(cursor.created_at)},id.gt.${pgVal(cursor.id)})`
      )
    }
  }

  if (direction === 'backward') {
    query = query
      .order('created_at', { ascending: true })
      .order('id',         { ascending: true })
  } else {
    query = query
      .order('created_at', { ascending: false })
      .order('id',         { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch activities.')

  return buildPaginatedResult(
    data ?? [],
    limit,
    direction,
    isFirstPage,
    (row) => ({ created_at: row.created_at, id: row.id }),
  )
}

export async function getOpenFollowUps(
  clientId?: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<FollowUp & { clients?: { first_name: string; last_name: string } | null }>> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const limit       = clampLimit(pagination?.limit)
  const isFirstPage = !pagination?.after && !pagination?.before
  const direction   = pagination?.before ? 'backward' : 'forward'

  let query = supabase
    .from('follow_ups')
    .select('*, clients(first_name, last_name)')
    .eq('organisation_id', orgId)
    .eq('status', 'open')
    .limit(limit + 1)

  if (clientId) query = query.eq('client_id', clientId)

  if (pagination?.after) {
    const cursor = decodeCursor(pagination.after)
    if (cursor) {
      // due_date can be null; fall back to id comparison for null due dates
      query = query.or(
        `due_date.gt.${pgVal(cursor.due_date)},and(due_date.eq.${pgVal(cursor.due_date)},id.gt.${pgVal(cursor.id)}),and(due_date.is.null,id.gt.${pgVal(cursor.id)})`
      )
    }
  } else if (pagination?.before) {
    const cursor = decodeCursor(pagination.before)
    if (cursor) {
      query = query.or(
        `due_date.lt.${pgVal(cursor.due_date)},and(due_date.eq.${pgVal(cursor.due_date)},id.lt.${pgVal(cursor.id)})`
      )
    }
  }

  if (direction === 'backward') {
    query = query
      .order('due_date', { ascending: false, nullsFirst: false })
      .order('id',       { ascending: false })
  } else {
    query = query
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('id',       { ascending: true })
  }

  const { data } = await query

  return buildPaginatedResult(
    data ?? [],
    limit,
    direction,
    isFirstPage,
    (row) => ({ due_date: row.due_date ?? '', id: row.id }),
  )
}

/** All open follow-ups for the org — used by the dashboard widget. */
export async function getAllOpenFollowUps(
  pagination?: PaginationParams,
): Promise<PaginatedResult<FollowUp & { clients?: { first_name: string; last_name: string } | null }>> {
  return getOpenFollowUps(undefined, pagination)
}
