'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import type { ClientStatus } from '@/lib/types'
import { getOrgAndUser, requireAdmin } from './_auth'
import { str, requiredStr } from './_validate'
import { logAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/posthog'

export async function createClientAction(formData: FormData) {
  const { supabase, orgId, userId } = await getOrgAndUser()

  const status = formData.get('status') as ClientStatus ?? 'active'
  const pipelineStageId = status === 'lead' ? str(formData, 'pipeline_stage_id', 36) : null
  const estimatedValueRaw = formData.get('estimated_monthly_value') as string | null
  const estimatedMonthlyValue =
    status === 'lead' && estimatedValueRaw
      ? parseFloat(estimatedValueRaw) || null
      : null

  const { error } = await supabase.from('clients').insert({
    organisation_id:         orgId,
    first_name:              requiredStr(formData, 'first_name', 100),
    last_name:               requiredStr(formData, 'last_name', 100),
    email:                   str(formData, 'email', 254),
    phone:                   str(formData, 'phone', 30),
    secondary_phone:         str(formData, 'secondary_phone', 30),
    notes:                   str(formData, 'notes', 5000),
    status,
    source:                  str(formData, 'source', 50),
    pipeline_stage_id:       pipelineStageId,
    estimated_monthly_value: estimatedMonthlyValue,
    pipeline_entered_at:     pipelineStageId ? new Date().toISOString() : null,
  })

  if (error) throw new Error('Failed to create client. Please try again.')

  await captureServerEvent({
    distinctId: userId,
    event:      'client_created',
    properties: {
      status: formData.get('status') as string ?? 'active',
      source: str(formData, 'source', 50) || null,
    },
  })

  revalidatePath('/dashboard/clients')
  if (status === 'lead') revalidatePath('/dashboard/pipeline')

  const returnTo = (formData.get('return_to') as string | null) ?? ''
  const safePath = returnTo.startsWith('/dashboard/') ? returnTo : '/dashboard/clients'
  redirect(safePath)
}

export async function updateClientAction(id: string, formData: FormData) {
  const { supabase, orgId } = await getOrgAndUser()

  const { error } = await supabase
    .from('clients')
    .update({
      first_name:      requiredStr(formData, 'first_name', 100),
      last_name:       requiredStr(formData, 'last_name', 100),
      email:           str(formData, 'email', 254),
      phone:           str(formData, 'phone', 30),
      secondary_phone: str(formData, 'secondary_phone', 30),
      notes:           str(formData, 'notes', 5000),
      status:          formData.get('status') as ClientStatus,
      source:          str(formData, 'source', 50),
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
  const { supabase, orgId, userId } = await requireAdmin()

  // Snapshot the client's name before deletion for the audit log
  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('organisation_id', orgId)

  if (error) throw new Error('Failed to delete client. Please try again.')

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'delete_client',
    resourceType: 'client',
    resourceId: id,
    metadata: client ? { name: `${client.first_name} ${client.last_name}` } : undefined,
  })

  revalidatePath('/dashboard/clients')
  redirect('/dashboard/clients')
}

// Admin-only — verify org ownership via clients.organisation_id join
export async function deletePropertyAction(propertyId: string, clientId: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Snapshot address + verify org ownership before deleting
  const { data: prop } = await supabase
    .from('properties')
    .select('id, address_line1, town, clients!inner(organisation_id)')
    .eq('id', propertyId)
    .eq('clients.organisation_id', orgId)
    .single()

  if (!prop) return { error: 'Property not found.' }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) return { error: 'Failed to delete property. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'delete_property',
    resourceType: 'property',
    resourceId: propertyId,
    metadata: { address: [prop.address_line1, prop.town].filter(Boolean).join(', ') },
  })

  revalidatePath(`/dashboard/clients/${clientId}`)
  redirect(`/dashboard/clients/${clientId}`)
}
