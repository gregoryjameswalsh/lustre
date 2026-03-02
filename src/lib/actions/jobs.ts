'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { getOrgAndUser, requireAdmin } from './_auth'

export async function deleteJobAction(jobId: string): Promise<{ error?: string }> {
  const { supabase, orgId } = await requireAdmin()

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete job. Please try again.' }

  revalidatePath('/dashboard/jobs')
  redirect('/dashboard/jobs')
}
