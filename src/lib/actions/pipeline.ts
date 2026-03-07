'use server'

// src/lib/actions/pipeline.ts
// =============================================================================
// LUSTRE — Pipeline server actions
// =============================================================================

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { requirePermission, getOrgAndUser } from './_auth'
import { str, requiredStr } from './_validate'
import { logAuditEvent }   from '@/lib/audit'

// ---------------------------------------------------------------------------
// Deals — create / update / move / delete
// ---------------------------------------------------------------------------

export async function createDealAction(formData: FormData): Promise<void> {
  const { supabase, orgId } = await requirePermission('pipeline:write')

  const title         = requiredStr(formData, 'title', 200)
  const clientId      = formData.get('client_id') as string
  const stageId       = formData.get('stage_id') as string
  const valueRaw      = formData.get('value') as string | null
  const expectedClose = str(formData, 'expected_close', 10)
  const assignedTo    = str(formData, 'assigned_to', 36)
  const notes         = str(formData, 'notes', 5000)

  if (!clientId) throw new Error('Client is required.')
  if (!stageId)  throw new Error('Stage is required.')

  const value = valueRaw ? parseFloat(valueRaw) : null
  if (valueRaw && (isNaN(value!) || value! < 0)) throw new Error('Value must be a positive number.')

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organisation_id: orgId,
      client_id:       clientId,
      stage_id:        stageId,
      title,
      value,
      expected_close:  expectedClose,
      assigned_to:     assignedTo,
      notes,
    })
    .select('id')
    .single()

  if (error) throw new Error('Failed to create deal. Please try again.')

  revalidatePath('/dashboard/pipeline')
  redirect(`/dashboard/pipeline/${deal.id}`)
}

export async function updateDealAction(
  dealId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('pipeline:write')

  const title         = requiredStr(formData, 'title', 200)
  const stageId       = formData.get('stage_id') as string
  const valueRaw      = formData.get('value') as string | null
  const expectedClose = str(formData, 'expected_close', 10)
  const assignedTo    = str(formData, 'assigned_to', 36)
  const notes         = str(formData, 'notes', 5000)

  const value = valueRaw ? parseFloat(valueRaw) : null
  if (valueRaw && (isNaN(value!) || value! < 0)) return { error: 'Value must be a positive number.' }

  const { error } = await supabase
    .from('deals')
    .update({ title, stage_id: stageId, value, expected_close: expectedClose, assigned_to: assignedTo, notes })
    .eq('id', dealId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to update deal. Please try again.' }

  revalidatePath('/dashboard/pipeline')
  revalidatePath(`/dashboard/pipeline/${dealId}`)
  return {}
}

/** Move a deal to a new stage — called by Kanban drag-and-drop. */
export async function moveDealAction(
  dealId: string,
  newStageId: string
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('pipeline:write')

  // Look up the stage to check is_won / is_lost flags
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('is_won, is_lost, name')
    .eq('id', newStageId)
    .eq('organisation_id', orgId)
    .single()

  if (!stage) return { error: 'Stage not found.' }

  const updates: Record<string, unknown> = { stage_id: newStageId }

  if (stage.is_won) {
    updates.won_at  = new Date().toISOString()
    updates.lost_at = null
    updates.lost_reason = null
  } else if (stage.is_lost) {
    updates.lost_at = new Date().toISOString()
    updates.won_at  = null
  } else {
    // Moving to an open stage clears won/lost
    updates.won_at  = null
    updates.lost_at = null
    updates.lost_reason = null
  }

  const { error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to move deal.' }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'move_deal',
    resourceType: 'deal',
    resourceId:   dealId,
    metadata:     { new_stage: stage.name },
  })

  revalidatePath('/dashboard/pipeline')
  return {}
}

export async function deleteDealAction(dealId: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('pipeline:delete')

  const { data: deal } = await supabase
    .from('deals')
    .select('title')
    .eq('id', dealId)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', dealId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete deal.' }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'delete_deal',
    resourceType: 'deal',
    resourceId:   dealId,
    metadata:     { title: deal?.title },
  })

  revalidatePath('/dashboard/pipeline')
  redirect('/dashboard/pipeline')
}

// ---------------------------------------------------------------------------
// Stage management
// ---------------------------------------------------------------------------

export async function createStageAction(formData: FormData): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('settings:write')

  const name   = requiredStr(formData, 'name', 50)
  const colour = str(formData, 'colour', 7) ?? '#8fa891'

  // Place at the end, before Won/Lost
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

  const updates = stageIds.map((id, index) => ({ id, position: index }))

  for (const { id, position } of updates) {
    await supabase
      .from('pipeline_stages')
      .update({ position })
      .eq('id', id)
      .eq('organisation_id', orgId)
  }

  revalidatePath('/dashboard/pipeline')
  return {}
}
