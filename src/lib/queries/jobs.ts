import { createClient } from '@/lib/supabase/server'
import { clampLimit, buildPaginatedResult, decodeCursor, pgVal } from '@/lib/pagination'
import type { JobWithRelations } from '@/lib/types'
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

export async function getJobs(
  statusFilter?: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<JobWithRelations>> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const limit       = clampLimit(pagination?.limit)
  const isFirstPage = !pagination?.after && !pagination?.before
  const direction   = pagination?.before ? 'backward' : 'forward'

  let query = supabase
    .from('jobs')
    .select(`
      *,
      clients (first_name, last_name),
      properties (address_line1, town),
      job_types (name)
    `)
    .eq('organisation_id', orgId)
    .limit(limit + 1)

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  if (pagination?.after) {
    const cursor = decodeCursor(pagination.after)
    if (cursor) {
      // Forward: older records in scheduled_date DESC order
      query = query.or(
        `scheduled_date.lt.${pgVal(cursor.scheduled_date)},and(scheduled_date.eq.${pgVal(cursor.scheduled_date)},id.lt.${pgVal(cursor.id)})`
      )
    }
  } else if (pagination?.before) {
    const cursor = decodeCursor(pagination.before)
    if (cursor) {
      // Backward: newer records (run ASC, reversed in buildPaginatedResult)
      query = query.or(
        `scheduled_date.gt.${pgVal(cursor.scheduled_date)},and(scheduled_date.eq.${pgVal(cursor.scheduled_date)},id.gt.${pgVal(cursor.id)})`
      )
    }
  }

  if (direction === 'backward') {
    query = query
      .order('scheduled_date', { ascending: true })
      .order('id',             { ascending: true })
  } else {
    query = query
      .order('scheduled_date', { ascending: false })
      .order('id',             { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch jobs.')

  return buildPaginatedResult(
    data ?? [],
    limit,
    direction,
    isFirstPage,
    (row) => ({ scheduled_date: row.scheduled_date, id: row.id }),
  )
}

/** Lightweight per-status counts — used by the Jobs page summary cards. */
export async function getJobStatusCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', orgId)
        .eq('status', status)
      return [status, count ?? 0] as const
    })
  )

  return Object.fromEntries(counts)
}

export async function getJob(id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (id, first_name, last_name, email, phone),
      properties (id, address_line1, address_line2, town, postcode),
      job_types (id, name)
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (error) return null
  return data
}
