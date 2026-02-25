import { createClient } from '@/lib/supabase/server'
import type { JobWithRelations } from '@/lib/types'

export async function getJobs(): Promise<JobWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (first_name, last_name),
      properties (address_line1, town)
    `)
    .order('scheduled_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getJob(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (id, first_name, last_name, email, phone),
      properties (id, address_line1, address_line2, town, postcode)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data
}