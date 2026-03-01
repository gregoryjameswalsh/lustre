import { createClient } from '@/lib/supabase/server'
import type { Activity, FollowUp } from '@/lib/types'

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

export async function getClientActivities(clientId: string): Promise<Activity[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      profiles (full_name, email)
    `)
    .eq('client_id', clientId)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch activities.')
  return data ?? []
}

export async function getOpenFollowUps(clientId?: string): Promise<FollowUp[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  let query = supabase
    .from('follow_ups')
    .select('*, clients(first_name, last_name)')
    .eq('organisation_id', orgId)
    .eq('status', 'open')
    .order('due_date', { ascending: true })

  if (clientId) query = query.eq('client_id', clientId)

  const { data } = await query
  return data ?? []
}

export async function getAllOpenFollowUps(): Promise<FollowUp[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data } = await supabase
    .from('follow_ups')
    .select('*, clients(first_name, last_name)')
    .eq('organisation_id', orgId)
    .eq('status', 'open')
    .order('due_date', { ascending: true })
  return data ?? []
}
