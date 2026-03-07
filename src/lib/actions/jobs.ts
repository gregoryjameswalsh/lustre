'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { requireAdmin } from './_auth'
import { logAuditEvent } from '@/lib/audit'

export async function deleteJobAction(jobId: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Snapshot job type + date before deletion for the audit log
  const { data: job } = await supabase
    .from('jobs')
    .select('job_type_id, scheduled_date, job_types(name)')
    .eq('id', jobId)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete job. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'delete_job',
    resourceType: 'job',
    resourceId: jobId,
    metadata: job ? { job_type: (job as { job_types?: { name: string } | null }).job_types?.name, scheduled_date: job.scheduled_date } : undefined,
  })

  revalidatePath('/dashboard/jobs')
  redirect('/dashboard/jobs')
}
