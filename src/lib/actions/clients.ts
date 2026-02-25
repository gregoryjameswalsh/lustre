'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ClientStatus } from '@/lib/types'

export async function createClientAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organisation_id) throw new Error('No organisation found')

  const { error } = await supabase.from('clients').insert({
    organisation_id: profile.organisation_id,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    secondary_phone: formData.get('secondary_phone') as string || null,
    notes: formData.get('notes') as string || null,
    status: formData.get('status') as ClientStatus ?? 'active',
    source: formData.get('source') as string || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

export async function updateClientAction(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('clients').update({
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    secondary_phone: formData.get('secondary_phone') as string || null,
    notes: formData.get('notes') as string || null,
    status: formData.get('status') as ClientStatus,
    source: formData.get('source') as string || null,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  redirect(`/dashboard/clients/${id}`)
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}