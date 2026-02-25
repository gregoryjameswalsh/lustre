import { createClient } from '@/lib/supabase/server'
import type { JobWithRelations, Client } from '@/lib/types'

export async function getDashboardStats() {
  const supabase = await createClient()

  const [
    { count: clientCount },
    { count: jobCount },
    { count: scheduledCount },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
  ])

  return { clientCount, jobCount, scheduledCount }
}

export async function getRecentClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

export async function getUpcomingJobs(): Promise<JobWithRelations[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (first_name, last_name),
      properties (address_line1, town)
    `)
    .eq('status', 'scheduled')
    .order('scheduled_date', { ascending: true })
    .limit(5)
  return data ?? []
}