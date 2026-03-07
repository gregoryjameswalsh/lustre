// src/lib/queries/job-types.ts
// =============================================================================
// LUSTRE — Job Type Query Functions
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import type { JobType } from '@/lib/types'

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

/** All job types for the current org, ordered by sort_order. */
export async function getJobTypes(): Promise<JobType[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('job_types')
    .select('*')
    .eq('organisation_id', orgId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error('Failed to fetch job types.')
  return data ?? []
}

/** Active job types only — used for job creation/edit forms. */
export async function getActiveJobTypes(): Promise<JobType[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('job_types')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error('Failed to fetch job types.')
  return data ?? []
}
