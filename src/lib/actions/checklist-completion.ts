'use server'

// src/lib/actions/checklist-completion.ts
// =============================================================================
// LUSTRE — Job checklist completion server actions
//
// startJobAction        — transitions a scheduled job to in_progress and
//                         auto-instantiates a checklist if a template is found
// toggleChecklistItem   — check / uncheck an individual checklist item
// =============================================================================

import { revalidatePath } from 'next/cache'
import { getOrgAndUser }  from './_auth'

export type TemplateChoice = { id: string; name: string }

export type StartJobResult =
  | { ok: true }
  | { ok: false; needsTemplateChoice: true; templates: TemplateChoice[] }
  | { ok: false; needsTemplateChoice?: false; error: string }

/**
 * Transition a scheduled job to in_progress, optionally instantiating a
 * checklist from the matching template.
 *
 * Pass templateId when the caller is responding to a multi-template prompt.
 * Omit it for the initial call — the action will auto-select if exactly one
 * active template matches the job type, or return the choices otherwise.
 */
export async function startJobAction(
  jobId: string,
  templateId?: string
): Promise<StartJobResult> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  // Fetch the job to verify ownership, current status, and job type
  const { data: job } = await supabase
    .from('jobs')
    .select('id, status, job_type_id')
    .eq('id', jobId)
    .eq('organisation_id', orgId)
    .single()

  if (!job) return { ok: false, error: 'Job not found.' }
  if (job.status !== 'scheduled') return { ok: false, error: 'Job is not in scheduled state.' }

  // -------------------------------------------------------------------------
  // Determine which template to use (if any)
  // -------------------------------------------------------------------------
  let resolvedTemplateId: string | null = templateId ?? null

  if (!resolvedTemplateId && job.job_type_id) {
    // Find all template IDs associated with this job type
    const { data: junction } = await supabase
      .from('checklist_template_job_types')
      .select('checklist_template_id')
      .eq('job_type_id', job.job_type_id)
      .eq('organisation_id', orgId)

    const linkedIds = (junction ?? []).map(j => j.checklist_template_id)

    if (linkedIds.length > 0) {
      // Filter to active templates only
      const { data: activeTemplates } = await supabase
        .from('checklist_templates')
        .select('id, name')
        .in('id', linkedIds)
        .eq('is_active', true)
        .eq('organisation_id', orgId)

      const templates = activeTemplates ?? []

      if (templates.length === 1) {
        resolvedTemplateId = templates[0].id
      } else if (templates.length > 1) {
        // Multiple active templates — let the caller choose
        return {
          ok: false,
          needsTemplateChoice: true,
          templates: templates.map(t => ({ id: t.id, name: t.name })),
        }
      }
      // 0 active templates → proceed without a checklist
    }
  }

  // -------------------------------------------------------------------------
  // Instantiate the checklist if we have a template
  // -------------------------------------------------------------------------
  if (resolvedTemplateId) {
    // Fetch template name and all items (ordered by sort_order)
    const { data: template } = await supabase
      .from('checklist_templates')
      .select(`
        id, name,
        checklist_template_items (id, title, guidance, sort_order)
      `)
      .eq('id', resolvedTemplateId)
      .eq('organisation_id', orgId)
      .order('sort_order', { referencedTable: 'checklist_template_items', ascending: true })
      .single()

    if (template) {
      // Insert checklist header (UNIQUE on job_id prevents duplicates)
      const { data: checklist, error: clErr } = await supabase
        .from('job_checklists')
        .insert({
          organisation_id: orgId,
          job_id:          jobId,
          template_id:     template.id,
          template_name:   template.name,
        })
        .select('id')
        .single()

      // If constraint error (duplicate), ignore — checklist already exists
      if (!clErr && checklist && template.checklist_template_items?.length > 0) {
        await supabase.from('job_checklist_items').insert(
          template.checklist_template_items.map((item: {
            id: string; title: string; guidance: string | null; sort_order: number
          }) => ({
            organisation_id:  orgId,
            job_checklist_id: checklist.id,
            template_item_id: item.id,
            title:            item.title,
            guidance:         item.guidance ?? null,
            sort_order:       item.sort_order,
          }))
        )
      }
    }
  }

  // -------------------------------------------------------------------------
  // Update job status to in_progress
  // -------------------------------------------------------------------------
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress' })
    .eq('id', jobId)
    .eq('organisation_id', orgId)

  if (error) return { ok: false, error: 'Failed to update job status.' }

  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { ok: true }
}

/**
 * Check or uncheck a single checklist item.
 * Available to all authenticated org members (team members included).
 * Only takes effect while the job is in_progress (enforced in the UI;
 * the RLS policy does not enforce job status).
 */
export async function toggleChecklistItemAction(
  itemId: string,
  completed: boolean
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  const update = completed
    ? { is_completed: true,  completed_by: userId,  completed_at: new Date().toISOString() }
    : { is_completed: false, completed_by: null,    completed_at: null }

  const { error } = await supabase
    .from('job_checklist_items')
    .update(update)
    .eq('id', itemId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to update checklist item.' }
  return {}
}
