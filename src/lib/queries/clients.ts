import { createClient } from '@/lib/supabase/server'
import { clampLimit, buildPaginatedResult, decodeCursor, pgVal } from '@/lib/pagination'
import type { Client } from '@/lib/types'
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

export async function getClients(pagination?: PaginationParams): Promise<PaginatedResult<Client>> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const limit       = clampLimit(pagination?.limit)
  const isFirstPage = !pagination?.after && !pagination?.before
  const direction   = pagination?.before ? 'backward' : 'forward'

  let query = supabase
    .from('clients')
    .select('*')
    .eq('organisation_id', orgId)
    .limit(limit + 1)

  if (pagination?.after) {
    const cursor = decodeCursor(pagination.after)
    if (cursor) {
      // Forward: records that come after the cursor in last_name ASC order
      query = query.or(
        `last_name.gt.${pgVal(cursor.last_name)},and(last_name.eq.${pgVal(cursor.last_name)},id.gt.${pgVal(cursor.id)})`
      )
    }
  } else if (pagination?.before) {
    const cursor = decodeCursor(pagination.before)
    if (cursor) {
      // Backward: records that come before the cursor in last_name ASC order
      // (query runs DESC so we can use limit efficiently, then we reverse)
      query = query.or(
        `last_name.lt.${pgVal(cursor.last_name)},and(last_name.eq.${pgVal(cursor.last_name)},id.lt.${pgVal(cursor.id)})`
      )
    }
  }

  // Backward queries run DESC so the DB index scan is efficient; result is
  // reversed back to ASC in buildPaginatedResult.
  if (direction === 'backward') {
    query = query
      .order('last_name', { ascending: false })
      .order('id',        { ascending: false })
  } else {
    query = query
      .order('last_name', { ascending: true })
      .order('id',        { ascending: true })
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch clients.')

  return buildPaginatedResult(
    data ?? [],
    limit,
    direction,
    isFirstPage,
    (row) => ({ last_name: row.last_name, id: row.id }),
  )
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (error) return null
  return data
}

export async function getClientWithProperties(id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      pipeline_stages (name, colour, is_won, is_lost),
      pipeline_assigned_profile:profiles!clients_pipeline_assigned_to_fkey (full_name),
      properties (*),
      jobs (
        *,
        properties (address_line1, town)
      )
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (error) return null
  return data
}
