import { createClient } from '@/lib/supabase/server'
import type { JobWithRelations } from '@/lib/types'

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

export async function getJobs(): Promise<JobWithRelations[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (first_name, last_name),
      properties (address_line1, town)
    `)
    .eq('organisation_id', orgId)
    .order('scheduled_date', { ascending: false })

  if (error) throw new Error('Failed to fetch jobs.')
  return data ?? []
}

export async function getJob(id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (id, first_name, last_name, email, phone),
      properties (id, address_line1, address_line2, town, postcode)
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (error) return null
  return data
}
