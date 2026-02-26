import { createClient } from '@/lib/supabase/server'
import type { Activity, FollowUp } from '@/lib/types'

export async function getClientActivities(clientId: string): Promise<Activity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      profiles (full_name, email)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getOpenFollowUps(clientId?: string): Promise<FollowUp[]> {
  const supabase = await createClient()
  let query = supabase
    .from('follow_ups')
    .select('*, clients(first_name, last_name)')
    .eq('status', 'open')
    .order('due_date', { ascending: true })

  if (clientId) query = query.eq('client_id', clientId)

  const { data } = await query
  return data ?? []
}

export async function getAllOpenFollowUps(): Promise<FollowUp[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('follow_ups')
    .select('*, clients(first_name, last_name)')
    .eq('status', 'open')
    .order('due_date', { ascending: true })
  return data ?? []
}