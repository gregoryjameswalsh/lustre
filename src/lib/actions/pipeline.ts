'use server'

// src/lib/actions/pipeline.ts
// =============================================================================
// LUSTRE — Pipeline server actions (client-centric model)
// The pipeline moves clients (leads) through acquisition stages.
// =============================================================================

import { revalidatePath } from 'next/cache'
import { requirePermission, getOrgAndUser } from './_auth'
import { str, requiredStr } from './_validate'
import { logAuditEvent }   from '@/lib/audit'

// ---------------------------------------------------------------------------
// Move a client to a different pipeline stage (drag-and-drop between columns)
// Only non-terminal stages reach this action — won/lost are handled separately.
// ---------------------------------------------------------------------------

export async function moveClientStageAction(
  clientId: string,
  newStageId: string
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('pipeline:write')

  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('name, is_won, is_lost')
    .eq('id', newStageId)
    .eq('organisation_id', orgId)
    .single()

  if (!stage) return { error: 'Stage not found.' }

  const { error } = await supabase
    .from('clients')
    .update({
      pipeline_stage_id:   newStageId,
      pipeline_entered_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('organisation_id', orgId)
    .eq('status', 'lead')

  if (error) return { error: 'Failed to move client.' }

  // Log activity
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organisation_id', orgId)
    .single()

  if (client) {
    await supabase.from('activities').insert({
      organisation_id: orgId,
      client_id:       clientId,
      created_by:      userId,
      type:            'pipeline_stage_changed',
      title:           `Moved to ${stage.name}`,
      pinned:          false,
    })
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'pipeline_move_client',
    resourceType: 'client',
    resourceId:   clientId,
    metadata:     { new_stage: stage.name },
  })

  revalidatePath('/dashboard/pipeline')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return {}
}

// ---------------------------------------------------------------------------
// Win a client — converts lead to active client, removes from pipeline
// ---------------------------------------------------------------------------

export async function winClientAction(
  clientId: string
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('pipeline:write')

  const { error } = await supabase
    .from('clients')
    .update({
      status:            'active',
      pipeline_stage_id: null,
      pipeline_entered_at: null,
      won_at:            new Date().toISOString(),
      lost_at:           null,
      lost_reason:       null,
    })
    .eq('id', clientId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to mark client as won.' }

  await supabase.from('activities').insert({
    organisation_id: orgId,
    client_id:       clientId,
    created_by:      userId,
    type:            'pipeline_won',
    title:           'Client won',
    pinned:          false,
  })

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'pipeline_win_client',
    resourceType: 'client',
    resourceId:   clientId,
  })

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return {}
}

// ---------------------------------------------------------------------------
// Lose a client — marks inactive, records lost reason, removes from pipeline
// ---------------------------------------------------------------------------

export async function loseClientAction(
  clientId: string,
  lostReason: string | null
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('pipeline:write')

  const { error } = await supabase
    .from('clients')
    .update({
      status:            'inactive',
      pipeline_stage_id: null,
      pipeline_entered_at: null,
      lost_at:           new Date().toISOString(),
      lost_reason:       lostReason,
      won_at:            null,
    })
    .eq('id', clientId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to mark client as lost.' }

  await supabase.from('activities').insert({
    organisation_id: orgId,
    client_id:       clientId,
    created_by:      userId,
    type:            'pipeline_lost',
    title:           'Client lost',
    body:            lostReason,
    pinned:          false,
  })

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'pipeline_lose_client',
    resourceType: 'client',
    resourceId:   clientId,
    metadata:     { lost_reason: lostReason },
  })

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return {}
}

// ---------------------------------------------------------------------------
// Add an existing lead client to the pipeline (assigns a starting stage)
// ---------------------------------------------------------------------------

export async function addClientToPipelineAction(
  clientId: string,
  stageId: string,
  estimatedMonthlyValue?: number | null,
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('pipeline:write')

  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('id', stageId)
    .eq('organisation_id', orgId)
    .single()

  if (!stage) return { error: 'Stage not found.' }

  const { error } = await supabase
    .from('clients')
    .update({
      status:                  'lead',
      pipeline_stage_id:       stageId,
      pipeline_entered_at:     new Date().toISOString(),
      estimated_monthly_value: estimatedMonthlyValue ?? null,
      won_at:                  null,
      lost_at:                 null,
      lost_reason:             null,
    })
    .eq('id', clientId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to add client to pipeline.' }

  await supabase.from('activities').insert({
    organisation_id: orgId,
    client_id:       clientId,
    created_by:      userId,
    type:            'pipeline_stage_changed',
    title:           `Added to pipeline — ${stage.name}`,
    pinned:          false,
  })

  revalidatePath('/dashboard/pipeline')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return {}
}

// ---------------------------------------------------------------------------
// Stage management (unchanged from original)
// ---------------------------------------------------------------------------

export async function createStageAction(formData: FormData): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('settings:write')

  const name   = requiredStr(formData, 'name', 50)
  const colour = str(formData, 'colour', 7) ?? '#8fa891'

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('position')
    .eq('organisation_id', orgId)
    .order('position', { ascending: false })
    .limit(1)

  const maxPosition = stages?.[0]?.position ?? -1

  const { error } = await supabase
    .from('pipeline_stages')
    .insert({ organisation_id: orgId, name, colour, position: maxPosition + 1 })

  if (error) return { error: 'Failed to create stage.' }

  revalidatePath('/dashboard/pipeline')
  return {}
}

export async function reorderStagesAction(
  stageIds: string[]
): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('settings:write')

  for (const [index, id] of stageIds.entries()) {
    await supabase
      .from('pipeline_stages')
      .update({ position: index })
      .eq('id', id)
      .eq('organisation_id', orgId)
  }

  revalidatePath('/dashboard/pipeline')
  return {}
}

// ---------------------------------------------------------------------------
// Update pipeline-specific fields on a client (notes, value, assigned_to)
// ---------------------------------------------------------------------------

export async function updateClientPipelineAction(
  clientId: string,
  fields: {
    pipeline_notes?: string | null
    estimated_monthly_value?: number | null
    pipeline_assigned_to?: string | null
  }
): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('pipeline:write')

  const { error } = await supabase
    .from('clients')
    .update(fields)
    .eq('id', clientId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to update pipeline details.' }

  revalidatePath('/dashboard/pipeline')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return {}
}
