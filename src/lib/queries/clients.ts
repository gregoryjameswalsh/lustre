import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/types'

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('last_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getClientWithProperties(id: string) {
  const supabase = await createClient()
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
    .single()

  if (error) return null
  return data
}