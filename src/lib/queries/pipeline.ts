// src/lib/queries/pipeline.ts
// =============================================================================
// LUSTRE — Pipeline queries (client-centric model)
// The pipeline tracks clients (leads) moving through acquisition stages.
// =============================================================================

import { createClient }              from '@/lib/supabase/server'
import type { PipelineStage, ClientInPipeline } from '@/lib/types'

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

/** Returns only non-terminal (non-won, non-lost) stages — used for the Kanban columns. */
export async function getActiveStages(): Promise<PipelineStage[]> {
  const stages = await getStages()
  return stages.filter(s => !s.is_won && !s.is_lost)
}

// ---------------------------------------------------------------------------
// Pipeline clients
// ---------------------------------------------------------------------------

const CLIENT_PIPELINE_SELECT = `
  *,
  pipeline_stages (name, colour, is_won, is_lost),
  pipeline_assigned_profile:profiles!clients_pipeline_assigned_to_fkey (full_name)
` as const

/** All clients currently in the pipeline (status=lead, pipeline_stage_id set). */
export async function getPipelineClients(): Promise<ClientInPipeline[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_PIPELINE_SELECT)
    .eq('organisation_id', orgId)
    .eq('status', 'lead')
    .not('pipeline_stage_id', 'is', null)
    .order('pipeline_entered_at', { ascending: true })

  if (error) throw new Error('Failed to fetch pipeline clients.')
  const clients = (data ?? []) as ClientInPipeline[]
  if (clients.length === 0) return clients

  // Polymorphic join: fetch tags for all pipeline clients in one query.
  // entity_tags has no DB FK on entity_id so Supabase can't auto-join it.
  const clientIds = clients.map(c => c.id)
  const { data: entityTagRows } = await supabase
    .from('entity_tags')
    .select('entity_id, tags(id, name, colour)')
    .eq('entity_type', 'client')
    .in('entity_id', clientIds)

  // Build a map of clientId → tags
  const tagsByClient: Record<string, { id: string; name: string; colour: string | null }[]> = {}
  for (const row of entityTagRows ?? []) {
    if (!row.tags) continue
    if (!tagsByClient[row.entity_id]) tagsByClient[row.entity_id] = []
    tagsByClient[row.entity_id].push(row.tags as { id: string; name: string; colour: string | null })
  }

  return clients.map(c => ({ ...c, tags: tagsByClient[c.id] ?? [] }))
}

/** Pipeline clients grouped by stage_id — used to populate the Kanban board. */
export async function getClientsByStage(): Promise<Record<string, ClientInPipeline[]>> {
  const clients = await getPipelineClients()
  const byStage: Record<string, ClientInPipeline[]> = {}
  for (const client of clients) {
    if (!client.pipeline_stage_id) continue
    if (!byStage[client.pipeline_stage_id]) byStage[client.pipeline_stage_id] = []
    byStage[client.pipeline_stage_id].push(client)
  }
  return byStage
}
