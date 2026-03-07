// src/lib/queries/job-checklists.ts
// =============================================================================
// LUSTRE — Job Checklist Query Functions
// =============================================================================

import { createClient }          from '@/lib/supabase/server'
import type { JobChecklistWithItems } from '@/lib/types'

/**
 * Fetch the instantiated checklist for a job, including all items ordered
 * by sort_order and the completing team member's name for each item.
 * Returns null if no checklist has been created for this job.
 */
export async function getJobChecklist(jobId: string): Promise<JobChecklistWithItems | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_checklists')
    .select(`
      id, organisation_id, job_id, template_id, template_name, created_at,
      job_checklist_items (
        id, organisation_id, job_checklist_id, template_item_id,
        title, guidance, sort_order,
        is_completed, completed_by, completed_at, created_at,
        completed_by_profile:profiles!completed_by (full_name)
      )
    `)
    .eq('job_id', jobId)
    .order('sort_order', { referencedTable: 'job_checklist_items', ascending: true })
    .single()

  if (error || !data) return null

  return {
    ...data,
    items: (data.job_checklist_items ?? []) as JobChecklistWithItems['items'],
  }
}
