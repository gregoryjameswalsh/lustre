import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/types'

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

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organisation_id', orgId)
    .order('last_name', { ascending: true })

  if (error) throw new Error('Failed to fetch clients.')
  return data ?? []
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (error) return null
  return data
}

export async function getClientWithProperties(id: string) {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      properties (*),
      jobs (
        *,
        properties (address_line1, town)
      )
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (error) return null
  return data
}
