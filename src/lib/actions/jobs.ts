'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { requireAdmin } from './_auth'
import { logAuditEvent } from '@/lib/audit'

export async function deleteJobAction(jobId: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Snapshot service type + date before deletion for the audit log
  const { data: job } = await supabase
    .from('jobs')
    .select('service_type, scheduled_date')
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
    metadata: job ? { service_type: job.service_type, scheduled_date: job.scheduled_date } : undefined,
  })

  revalidatePath('/dashboard/jobs')
  redirect('/dashboard/jobs')
}
