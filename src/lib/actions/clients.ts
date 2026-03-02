'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import type { ClientStatus } from '@/lib/types'
import { getOrgAndUser, requireAdmin } from './_auth'

export async function createClientAction(formData: FormData) {
  const { supabase, orgId } = await getOrgAndUser()

  const { error } = await supabase.from('clients').insert({
    organisation_id:  orgId,
    first_name:       formData.get('first_name') as string,
    last_name:        formData.get('last_name') as string,
    email:            formData.get('email') as string || null,
    phone:            formData.get('phone') as string || null,
    secondary_phone:  formData.get('secondary_phone') as string || null,
    notes:            formData.get('notes') as string || null,
    status:           formData.get('status') as ClientStatus ?? 'active',
    source:           formData.get('source') as string || null,
  })

  if (error) throw new Error('Failed to create client. Please try again.')

  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

export async function updateClientAction(id: string, formData: FormData) {
  const { supabase, orgId } = await getOrgAndUser()

  const { error } = await supabase
    .from('clients')
    .update({
      first_name:      formData.get('first_name') as string,
      last_name:       formData.get('last_name') as string,
      email:           formData.get('email') as string || null,
      phone:           formData.get('phone') as string || null,
      secondary_phone: formData.get('secondary_phone') as string || null,
      notes:           formData.get('notes') as string || null,
      status:          formData.get('status') as ClientStatus,
      source:          formData.get('source') as string || null,
    })
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) throw new Error('Failed to update client. Please try again.')

  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  redirect(`/dashboard/clients/${id}`)
}

// Admin-only — team members can manage client records but only admins can delete
export async function deleteClientAction(id: string) {
  const { supabase, orgId } = await requireAdmin()

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) throw new Error('Failed to delete client. Please try again.')

  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

// Admin-only — verify org ownership via clients.organisation_id join
export async function deletePropertyAction(propertyId: string, clientId: string): Promise<{ error?: string }> {
  const { supabase, orgId } = await requireAdmin()

  // Ensure the property belongs to a client in this org before deleting
  const { data: prop } = await supabase
    .from('properties')
    .select('id, clients!inner(organisation_id)')
    .eq('id', propertyId)
    .eq('clients.organisation_id', orgId)
    .single()

  if (!prop) return { error: 'Property not found.' }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) return { error: 'Failed to delete property. Please try again.' }

  revalidatePath(`/dashboard/clients/${clientId}`)
  redirect(`/dashboard/clients/${clientId}`)
}
