'use server'

// src/lib/actions/checklists.ts
// =============================================================================
// LUSTRE — Checklist Template Server Actions (admin-only)
// =============================================================================

import { revalidatePath } from 'next/cache'
import { requireAdmin }   from './_auth'
import { logAuditEvent }  from '@/lib/audit'

const CHECKLISTS_PATH = '/dashboard/settings/checklists'

// ---------------------------------------------------------------------------
// Template — Create
// ---------------------------------------------------------------------------

export type ChecklistTemplateState = { error?: string; success?: boolean; id?: string }

export async function createChecklistTemplateAction(
  prevState: ChecklistTemplateState,
  formData: FormData
): Promise<ChecklistTemplateState> {
  const { supabase, orgId, userId } = await requireAdmin()

  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Template name is required.' }
  if (name.length > 200) return { error: 'Name must be 200 characters or fewer.' }

  const { data: template, error } = await supabase
    .from('checklist_templates')
    .insert({ organisation_id: orgId, name, description, created_by: userId })
    .select('id')
    .single()

  if (error) return { error: 'Failed to create template. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'create_checklist_template',
    resourceType: 'checklist_template',
    resourceId: template.id,
    metadata: { name },
  })

  revalidatePath(CHECKLISTS_PATH)
  return { success: true, id: template.id }
}

// ---------------------------------------------------------------------------
// Template — Update (name, description, job type associations)
// ---------------------------------------------------------------------------

export async function updateChecklistTemplateAction(
  prevState: ChecklistTemplateState,
  formData: FormData
): Promise<ChecklistTemplateState> {
  const { supabase, orgId, userId } = await requireAdmin()

  const id          = formData.get('id') as string
  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  // job_type_ids is a multi-value field — getAll() returns string[]
  const jobTypeIds  = formData.getAll('job_type_ids') as string[]

  if (!id)   return { error: 'Template ID is required.' }
  if (!name) return { error: 'Template name is required.' }
  if (name.length > 200) return { error: 'Name must be 200 characters or fewer.' }

  // Update the template header
  const { error: updateError } = await supabase
    .from('checklist_templates')
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (updateError) return { error: 'Failed to update template. Please try again.' }

  // Replace job type associations: delete all, re-insert selected
  await supabase
    .from('checklist_template_job_types')
    .delete()
    .eq('checklist_template_id', id)
    .eq('organisation_id', orgId)

  if (jobTypeIds.length > 0) {
    const inserts = jobTypeIds.map(jtId => ({
      checklist_template_id: id,
      job_type_id: jtId,
      organisation_id: orgId,
    }))
    const { error: insertError } = await supabase
      .from('checklist_template_job_types')
      .insert(inserts)
    if (insertError) return { error: 'Failed to update job type associations. Please try again.' }
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'update_checklist_template',
    resourceType: 'checklist_template',
    resourceId: id,
    metadata: { name, job_type_count: jobTypeIds.length },
  })

  revalidatePath(CHECKLISTS_PATH)
  revalidatePath(`${CHECKLISTS_PATH}/${id}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// Template — Deactivate / Reactivate
// ---------------------------------------------------------------------------

export async function deactivateChecklistTemplateAction(id: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  const { data: template } = await supabase
    .from('checklist_templates')
    .select('name')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('checklist_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to deactivate template. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'deactivate_checklist_template',
    resourceType: 'checklist_template',
    resourceId: id,
    metadata: { name: template?.name },
  })

  revalidatePath(CHECKLISTS_PATH)
  return {}
}

export async function reactivateChecklistTemplateAction(id: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  const { data: template } = await supabase
    .from('checklist_templates')
    .select('name')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('checklist_templates')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to reactivate template. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'reactivate_checklist_template',
    resourceType: 'checklist_template',
    resourceId: id,
    metadata: { name: template?.name },
  })

  revalidatePath(CHECKLISTS_PATH)
  return {}
}

// ---------------------------------------------------------------------------
// Template — Delete (only if no job_checklists reference it)
// ---------------------------------------------------------------------------

export async function deleteChecklistTemplateAction(id: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  const { data: template } = await supabase
    .from('checklist_templates')
    .select('name')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  // Guard: check for job checklist instances that reference this template
  const { count } = await supabase
    .from('job_checklists')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', id)
    .eq('organisation_id', orgId)

  if ((count ?? 0) > 0) {
    return { error: 'This template has been used on jobs and cannot be deleted. Deactivate it instead.' }
  }

  const { error } = await supabase
    .from('checklist_templates')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete template. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'delete_checklist_template',
    resourceType: 'checklist_template',
    resourceId: id,
    metadata: { name: template?.name },
  })

  revalidatePath(CHECKLISTS_PATH)
  return {}
}

// ---------------------------------------------------------------------------
// Template — Duplicate
// ---------------------------------------------------------------------------

export async function duplicateChecklistTemplateAction(id: string): Promise<{ error?: string; newId?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Fetch source template with items and job type associations
  const { data: source } = await supabase
    .from('checklist_templates')
    .select(`
      name, description,
      checklist_template_items (title, guidance, sort_order),
      checklist_template_job_types (job_type_id)
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (!source) return { error: 'Template not found.' }

  const newName = `${source.name} (copy)`

  const { data: newTemplate, error: createError } = await supabase
    .from('checklist_templates')
    .insert({
      organisation_id: orgId,
      name: newName,
      description: source.description,
      created_by: userId,
    })
    .select('id')
    .single()

  if (createError) return { error: 'Failed to duplicate template. Please try again.' }

  const newId = newTemplate.id

  // Copy items
  if (source.checklist_template_items?.length > 0) {
    await supabase.from('checklist_template_items').insert(
      source.checklist_template_items.map((item: { title: string; guidance: string | null; sort_order: number }) => ({
        organisation_id: orgId,
        template_id: newId,
        title: item.title,
        guidance: item.guidance,
        sort_order: item.sort_order,
      }))
    )
  }

  // Copy job type associations
  if (source.checklist_template_job_types?.length > 0) {
    await supabase.from('checklist_template_job_types').insert(
      source.checklist_template_job_types.map((jt: { job_type_id: string }) => ({
        checklist_template_id: newId,
        job_type_id: jt.job_type_id,
        organisation_id: orgId,
      }))
    )
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'duplicate_checklist_template',
    resourceType: 'checklist_template',
    resourceId: newId,
    metadata: { source_id: id, name: newName },
  })

  revalidatePath(CHECKLISTS_PATH)
  return { newId }
}

// ---------------------------------------------------------------------------
// Template Items — Upsert all items for a template in a single batch
// Called from the template editor when saving the full item list.
// ---------------------------------------------------------------------------

export async function saveChecklistTemplateItemsAction(
  templateId: string,
  items: { id?: string; title: string; guidance: string | null; sort_order: number }[]
): Promise<{ error?: string }> {
  const { supabase, orgId } = await requireAdmin()

  // Verify the template belongs to this org
  const { data: template } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('id', templateId)
    .eq('organisation_id', orgId)
    .single()

  if (!template) return { error: 'Template not found.' }

  // Delete all existing items, then re-insert the full ordered list.
  // This is the simplest approach for a drag-and-drop editor where sort_order
  // can change arbitrarily.
  await supabase
    .from('checklist_template_items')
    .delete()
    .eq('template_id', templateId)
    .eq('organisation_id', orgId)

  if (items.length > 0) {
    const { error } = await supabase
      .from('checklist_template_items')
      .insert(
        items.map((item, idx) => ({
          organisation_id: orgId,
          template_id: templateId,
          title: item.title.trim(),
          guidance: item.guidance?.trim() || null,
          sort_order: idx,
        }))
      )
    if (error) return { error: 'Failed to save checklist items. Please try again.' }
  }

  revalidatePath(`${CHECKLISTS_PATH}/${templateId}`)
  return {}
}
