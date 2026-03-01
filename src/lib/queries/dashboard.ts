import { createClient } from '@/lib/supabase/server'
import type { JobWithRelations, Client } from '@/lib/types'

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

export async function getDashboardStats() {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const [
    { count: clientCount },
    { count: jobCount },
    { count: scheduledCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('organisation_id', orgId).eq('status', 'scheduled'),
  ])

  return { clientCount, jobCount, scheduledCount }
}

export async function getRecentClients(): Promise<Client[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

export async function getUpcomingJobs(): Promise<JobWithRelations[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (first_name, last_name),
      properties (address_line1, town)
    `)
    .eq('organisation_id', orgId)
    .eq('status', 'scheduled')
    .order('scheduled_date', { ascending: true })
    .limit(5)
  return data ?? []
}
