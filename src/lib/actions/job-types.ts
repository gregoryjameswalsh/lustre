'use server'

// src/lib/actions/job-types.ts
// =============================================================================
// LUSTRE — Job Type Server Actions (admin-only)
// =============================================================================

import { revalidatePath } from 'next/cache'
import { requireAdmin }   from './_auth'
import { logAuditEvent }  from '@/lib/audit'

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type JobTypeState = { error?: string; success?: boolean }

export async function createJobTypeAction(
  prevState: JobTypeState,
  formData: FormData
): Promise<JobTypeState> {
  const { supabase, orgId, userId } = await requireAdmin()

  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!name) return { error: 'Name is required.' }
  if (name.length > 100) return { error: 'Name must be 100 characters or fewer.' }
  if (description && description.length > 500) return { error: 'Description must be 500 characters or fewer.' }

  // Determine next sort_order
  const { data: last } = await supabase
    .from('job_types')
    .select('sort_order')
    .eq('organisation_id', orgId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sortOrder = last ? last.sort_order + 1 : 0

  const { data: jobType, error } = await supabase
    .from('job_types')
    .insert({ organisation_id: orgId, name, description, sort_order: sortOrder })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: `A job type named "${name}" already exists.` }
    return { error: 'Failed to create job type. Please try again.' }
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'create_job_type',
    resourceType: 'job_type',
    resourceId: jobType.id,
    metadata: { name },
  })

  revalidatePath('/dashboard/settings/job-types')
  revalidatePath('/dashboard/jobs/new')
  revalidatePath('/dashboard/jobs')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateJobTypeAction(
  prevState: JobTypeState,
  formData: FormData
): Promise<JobTypeState> {
  const { supabase, orgId, userId } = await requireAdmin()

  const id          = formData.get('id') as string
  const name        = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!id)   return { error: 'Job type ID is required.' }
  if (!name) return { error: 'Name is required.' }
  if (name.length > 100) return { error: 'Name must be 100 characters or fewer.' }
  if (description && description.length > 500) return { error: 'Description must be 500 characters or fewer.' }

  const { error } = await supabase
    .from('job_types')
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) {
    if (error.code === '23505') return { error: `A job type named "${name}" already exists.` }
    return { error: 'Failed to update job type. Please try again.' }
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'update_job_type',
    resourceType: 'job_type',
    resourceId: id,
    metadata: { name },
  })

  revalidatePath('/dashboard/settings/job-types')
  revalidatePath('/dashboard/jobs/new')
  revalidatePath('/dashboard/jobs')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Deactivate
// ---------------------------------------------------------------------------

export async function deactivateJobTypeAction(id: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Guard: must not deactivate the last active type
  const { count } = await supabase
    .from('job_types')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', orgId)
    .eq('is_active', true)

  if ((count ?? 0) <= 1) {
    return { error: 'You must have at least one active job type.' }
  }

  const { data: jobType } = await supabase
    .from('job_types')
    .select('name')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('job_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to deactivate job type. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'deactivate_job_type',
    resourceType: 'job_type',
    resourceId: id,
    metadata: { name: jobType?.name },
  })

  revalidatePath('/dashboard/settings/job-types')
  revalidatePath('/dashboard/jobs/new')
  return {}
}

// ---------------------------------------------------------------------------
// Reactivate
// ---------------------------------------------------------------------------

export async function reactivateJobTypeAction(id: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  const { data: jobType } = await supabase
    .from('job_types')
    .select('name')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('job_types')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to reactivate job type. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'reactivate_job_type',
    resourceType: 'job_type',
    resourceId: id,
    metadata: { name: jobType?.name },
  })

  revalidatePath('/dashboard/settings/job-types')
  revalidatePath('/dashboard/jobs/new')
  return {}
}

// ---------------------------------------------------------------------------
// Delete (only permitted if no jobs reference this type)
// ---------------------------------------------------------------------------

export async function deleteJobTypeAction(id: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Guard: must not delete the last active type
  const { count: activeCount } = await supabase
    .from('job_types')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', orgId)
    .eq('is_active', true)

  const { data: jobType } = await supabase
    .from('job_types')
    .select('name, is_active')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (jobType?.is_active && (activeCount ?? 0) <= 1) {
    return { error: 'You must have at least one active job type.' }
  }

  // Guard: check for jobs that reference this type
  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('job_type_id', id)
    .eq('organisation_id', orgId)

  if ((jobCount ?? 0) > 0) {
    return { error: 'This job type is used by existing jobs and cannot be deleted. Deactivate it instead.' }
  }

  const { error } = await supabase
    .from('job_types')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete job type. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'delete_job_type',
    resourceType: 'job_type',
    resourceId: id,
    metadata: { name: jobType?.name },
  })

  revalidatePath('/dashboard/settings/job-types')
  revalidatePath('/dashboard/jobs/new')
  return {}
}
