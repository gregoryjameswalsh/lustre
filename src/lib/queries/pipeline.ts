// src/lib/queries/pipeline.ts
// =============================================================================
// LUSTRE — Pipeline queries
// =============================================================================

import { createClient }            from '@/lib/supabase/server'
import type { PipelineStage, DealWithRelations } from '@/lib/types'

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

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export async function getStages(): Promise<PipelineStage[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('organisation_id', orgId)
    .order('position')

  if (error) throw new Error('Failed to fetch pipeline stages.')
  return data ?? []
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

const DEAL_SELECT = `
  *,
  clients (first_name, last_name),
  pipeline_stages (name, colour, is_won, is_lost),
  profiles!deals_assigned_to_fkey (full_name)
` as const

export async function getDeals(filters?: {
  stageId?:   string
  assignedTo?: string
  search?:    string
}): Promise<DealWithRelations[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  let query = supabase
    .from('deals')
    .select(DEAL_SELECT)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  if (filters?.stageId)    query = query.eq('stage_id', filters.stageId)
  if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch deals.')
  return (data ?? []) as DealWithRelations[]
}

export async function getDealsByStage(): Promise<Record<string, DealWithRelations[]>> {
  const deals = await getDeals()
  const byStage: Record<string, DealWithRelations[]> = {}
  for (const deal of deals) {
    if (!byStage[deal.stage_id]) byStage[deal.stage_id] = []
    byStage[deal.stage_id].push(deal)
  }
  return byStage
}

export async function getDeal(id: string): Promise<DealWithRelations | null> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = await supabase
    .from('deals')
    .select(DEAL_SELECT)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  return data as DealWithRelations | null
}
