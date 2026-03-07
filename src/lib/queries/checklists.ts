// src/lib/queries/checklists.ts
// =============================================================================
// LUSTRE — Checklist Template Query Functions
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import type { ChecklistTemplate, ChecklistTemplateWithRelations } from '@/lib/types'

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

/** All templates for the org, with item count and associated job types. */
export async function getChecklistTemplates(): Promise<(ChecklistTemplate & {
  item_count: number
  job_types: { id: string; name: string }[]
})[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('checklist_templates')
    .select(`
      *,
      checklist_template_items (id),
      checklist_template_job_types (
        job_type_id,
        job_types (id, name)
      )
    `)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw new Error('Failed to fetch checklist templates.')

  return (data ?? []).map(t => ({
    ...t,
    item_count: (t.checklist_template_items ?? []).length,
    job_types: (t.checklist_template_job_types ?? []).map(
      (jt: { job_types: { id: string; name: string } }) => jt.job_types
    ).filter(Boolean),
  }))
}

/** Single template with full items and job type associations. */
export async function getChecklistTemplate(id: string): Promise<ChecklistTemplateWithRelations | null> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('checklist_templates')
    .select(`
      *,
      checklist_template_items (id, title, guidance, sort_order, created_at),
      checklist_template_job_types (
        job_type_id,
        job_types (id, name)
      )
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .order('sort_order', { referencedTable: 'checklist_template_items', ascending: true })
    .single()

  if (error) return null

  return {
    ...data,
    checklist_template_items: data.checklist_template_items ?? [],
    checklist_template_job_types: data.checklist_template_job_types ?? [],
  } as ChecklistTemplateWithRelations
}

/**
 * Find active templates for a given job type.
 * Used when a job moves to in_progress to determine which template(s) to apply.
 */
export async function getActiveTemplatesForJobType(jobTypeId: string): Promise<ChecklistTemplate[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('checklist_templates')
    .select(`
      *,
      checklist_template_job_types!inner (job_type_id)
    `)
    .eq('organisation_id', orgId)
    .eq('is_active', true)
    .eq('checklist_template_job_types.job_type_id', jobTypeId)

  if (error) return []
  return data ?? []
}
