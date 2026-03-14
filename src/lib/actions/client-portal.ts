'use server'

// src/lib/actions/client-portal.ts
// =============================================================================
// LUSTRE — Client Portal Operator-Side Server Actions
//
// These actions are called from the operator dashboard:
//   - inviteClientToPortal      → send invitation email to a client
//   - resendPortalInvitation    → resend to a client whose invite expired
//   - revokePortalAccess        → suspend a client's portal account
//   - upsertPortalSettings      → save/update portal configuration
//   - acknowledgeClientInstruction → mark a job instruction as seen
// =============================================================================

import { redirect }                          from 'next/navigation'
import { requireAdmin, getOrgAndUser }       from './_auth'
import { logAuditEvent }                     from '@/lib/audit'
import { sendPortalInvitationEmail }         from '@/lib/email'
import type { ClientPortalSettings }         from '@/lib/types'

// ---------------------------------------------------------------------------
// Invite a client to the portal
// ---------------------------------------------------------------------------

export type PortalInviteState = { error?: string; success?: boolean }

export async function inviteClientToPortal(
  clientId: string
): Promise<PortalInviteState> {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return { error: 'Only admins can invite clients to the portal.' }
  }

  const { supabase, orgId, userId } = ctx

  // Check plan gating — Professional+ only
  const { data: org } = await supabase
    .from('organisations')
    .select('name, email, logo_url, brand_color, plan')
    .eq('id', orgId)
    .single()

  if (!org) return { error: 'Organisation not found.' }

  const gatedPlans = ['professional', 'business', 'enterprise']
  if (!gatedPlans.includes(org.plan)) {
    return { error: 'The Client Portal is available on Professional plans and above. Upgrade to continue.' }
  }

  // Confirm portal is enabled
  const { data: settings } = await supabase
    .from('client_portal_settings')
    .select('portal_enabled, portal_slug')
    .eq('organisation_id', orgId)
    .maybeSingle()

  if (!settings?.portal_enabled || !settings.portal_slug) {
    return { error: 'Please enable the Client Portal and set a portal slug in Settings → Client Portal before inviting clients.' }
  }

  // Fetch the client
  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, portal_status')
    .eq('id', clientId)
    .eq('organisation_id', orgId)
    .single()

  if (!client) return { error: 'Client not found.' }
  if (!client.email) return { error: 'This client has no email address. Please add one before inviting them.' }
  if (client.portal_status === 'active') return { error: 'This client already has an active portal account.' }

  // Expire any outstanding invitations for this client
  await supabase
    .from('client_portal_invitations')
    .delete()
    .eq('client_id', clientId)
    .is('used_at', null)

  // Create a new invitation
  const { data: invitation, error: insertError } = await supabase
    .from('client_portal_invitations')
    .insert({
      organisation_id: orgId,
      client_id:       clientId,
      email:           client.email,
      created_by:      userId,
    })
    .select('token, expires_at')
    .single()

  if (insertError || !invitation) {
    console.error('Portal invitation insert error:', insertError)
    return { error: 'Failed to create invitation. Please try again.' }
  }

  // Update the client's portal status to 'invited'
  await supabase
    .from('clients')
    .update({ portal_status: 'invited', portal_invited_at: new Date().toISOString() })
    .eq('id', clientId)

  // Send invitation email
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${settings.portal_slug}/invite/${invitation.token}`

  const { error: emailError } = await sendPortalInvitationEmail({
    clientEmail:     client.email,
    clientFirstName: client.first_name,
    orgName:         org.name,
    orgBrandColor:   org.brand_color,
    orgLogoUrl:      org.logo_url,
    activationUrl,
    expiresAt:       invitation.expires_at,
  })

  if (emailError) {
    // Roll back invitation + status update
    await supabase.from('client_portal_invitations').delete().eq('token', invitation.token)
    await supabase.from('clients').update({ portal_status: 'not_invited', portal_invited_at: null }).eq('id', clientId)
    return { error: 'Failed to send invitation email. Please try again.' }
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'portal_invite_client',
    resourceType: 'client',
    resourceId:   clientId,
    metadata:     { email: client.email },
  })

  return { success: true }
}


// ---------------------------------------------------------------------------
// Resend a portal invitation (to a client with 'invited' or 'not_invited' status)
// ---------------------------------------------------------------------------

export async function resendPortalInvitation(
  clientId: string
): Promise<PortalInviteState> {
  // Delegates to inviteClientToPortal which handles expiry + resend correctly
  return inviteClientToPortal(clientId)
}


// ---------------------------------------------------------------------------
// Revoke a client's portal access
// ---------------------------------------------------------------------------

export async function revokePortalAccess(
  clientId: string
): Promise<{ error?: string }> {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return { error: 'Only admins can revoke portal access.' }
  }

  const { supabase, orgId, userId } = ctx

  const { error } = await supabase
    .from('clients')
    .update({ portal_status: 'suspended' })
    .eq('id', clientId)
    .eq('organisation_id', orgId)

  if (error) {
    console.error('revokePortalAccess error:', error)
    return { error: 'Failed to revoke portal access.' }
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'portal_revoke_access',
    resourceType: 'client',
    resourceId:   clientId,
  })

  return {}
}


// ---------------------------------------------------------------------------
// Re-enable portal access for a suspended client
// ---------------------------------------------------------------------------

export async function reinstatePortalAccess(
  clientId: string
): Promise<{ error?: string }> {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return { error: 'Only admins can reinstate portal access.' }
  }

  const { supabase, orgId, userId } = ctx

  const { data: client } = await supabase
    .from('clients')
    .select('portal_status, portal_user_id')
    .eq('id', clientId)
    .eq('organisation_id', orgId)
    .single()

  if (!client) return { error: 'Client not found.' }
  if (client.portal_status !== 'suspended') return { error: 'Client is not suspended.' }

  // If they have a linked auth user, reinstate as active; otherwise back to invited
  const newStatus = client.portal_user_id ? 'active' : 'not_invited'

  const { error } = await supabase
    .from('clients')
    .update({ portal_status: newStatus })
    .eq('id', clientId)
    .eq('organisation_id', orgId)

  if (error) {
    console.error('reinstatePortalAccess error:', error)
    return { error: 'Failed to reinstate portal access.' }
  }

  return {}
}


// ---------------------------------------------------------------------------
// Upsert portal settings
// ---------------------------------------------------------------------------

export type PortalSettingsState = { error?: string; success?: boolean }

export async function upsertPortalSettings(
  prevState: PortalSettingsState,
  formData: FormData
): Promise<PortalSettingsState> {
  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    return { error: 'Only admins can update portal settings.' }
  }

  const { supabase, orgId, userId } = ctx

  // Check plan gating
  const { data: org } = await supabase
    .from('organisations')
    .select('plan, name')
    .eq('id', orgId)
    .single()

  if (!org) return { error: 'Organisation not found.' }

  const gatedPlans = ['professional', 'business', 'enterprise']
  if (!gatedPlans.includes(org.plan)) {
    return { error: 'The Client Portal is available on Professional plans and above.' }
  }

  const portalEnabled          = formData.get('portal_enabled') === 'true'
  const showTeamMemberName     = formData.get('show_team_member_name') === 'true'
  const showJobPricing         = formData.get('show_job_pricing') === 'true'
  const shareCompletedNotes    = formData.get('share_completed_notes') === 'true'
  const cutoffRaw              = parseInt(formData.get('instruction_cutoff_hours') as string ?? '24', 10)
  const instructionCutoffHours = isNaN(cutoffRaw) || cutoffRaw < 0 ? 24 : Math.min(cutoffRaw, 168)
  const welcomeMessage         = (formData.get('welcome_message') as string)?.trim() || null
  // Phase 3 additions
  const allowInvoiceAccess     = formData.get('allow_invoice_access') === 'true'
  const reminderRaw            = formData.get('job_reminder_days') as string
  const jobReminderDays        = reminderRaw && reminderRaw !== '' ? Math.max(1, Math.min(14, parseInt(reminderRaw, 10) || 1)) : null
  let   portalSlug             = (formData.get('portal_slug') as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || null

  if (portalEnabled && !portalSlug) {
    // Auto-generate from org name
    portalSlug = org.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) || 'my-portal'
  }

  const payload: Partial<ClientPortalSettings> & { organisation_id: string } = {
    organisation_id:          orgId,
    portal_enabled:           portalEnabled,
    portal_slug:              portalSlug,
    show_team_member_name:    showTeamMemberName,
    show_job_pricing:         showJobPricing,
    share_completed_notes:    shareCompletedNotes,
    instruction_cutoff_hours: instructionCutoffHours,
    welcome_message:          welcomeMessage,
    allow_invoice_access:     allowInvoiceAccess,
    job_reminder_days:        jobReminderDays,
  }

  const { error } = await supabase
    .from('client_portal_settings')
    .upsert(payload, { onConflict: 'organisation_id' })

  if (error) {
    // Unique slug conflict
    if (error.code === '23505') {
      return { error: 'This portal URL is already in use. Please choose a different one.' }
    }
    console.error('upsertPortalSettings error:', error)
    return { error: 'Failed to save portal settings. Please try again.' }
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'portal_settings_updated',
    resourceType: 'client_portal_settings',
  })

  return { success: true }
}


// ---------------------------------------------------------------------------
// Acknowledge a client instruction on a job (operator marks it as seen)
// ---------------------------------------------------------------------------

export async function acknowledgeClientInstruction(
  jobId: string
): Promise<{ error?: string }> {
  let ctx
  try {
    ctx = await getOrgAndUser()
  } catch {
    redirect('/login')
  }

  const { supabase, orgId, userId } = ctx

  const { error } = await supabase.rpc('operator_acknowledge_client_instruction', {
    p_job_id: jobId,
  })

  if (error) {
    console.error('acknowledgeClientInstruction error:', error)
    return { error: 'Failed to acknowledge instruction.' }
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'portal_client_instruction_acknowledged',
    resourceType: 'job',
    resourceId:   jobId,
  })

  return {}
}


// ---------------------------------------------------------------------------
// Bulk invite clients to the portal (Enterprise plan only)
// ---------------------------------------------------------------------------

export type BulkInviteState = {
  sent:    number
  failed:  number
  errors:  string[]
  success?: boolean
}

export async function bulkInviteClientsToPortal(
  clientIds: string[]
): Promise<BulkInviteState> {
  const result: BulkInviteState = { sent: 0, failed: 0, errors: [] }

  if (!clientIds.length) {
    result.errors.push('No clients selected.')
    return result
  }

  let ctx
  try {
    ctx = await requireAdmin()
  } catch {
    result.errors.push('Only admins can invite clients to the portal.')
    return result
  }

  const { supabase, orgId, userId } = ctx

  // Plan gate — Enterprise only
  const { data: org } = await supabase
    .from('organisations')
    .select('name, email, logo_url, brand_color, plan')
    .eq('id', orgId)
    .single()

  if (!org) {
    result.errors.push('Organisation not found.')
    return result
  }

  if (org.plan !== 'enterprise') {
    result.errors.push('Bulk invitations require an Enterprise plan.')
    return result
  }

  const { data: settings } = await supabase
    .from('client_portal_settings')
    .select('portal_enabled, portal_slug')
    .eq('organisation_id', orgId)
    .maybeSingle()

  if (!settings?.portal_enabled || !settings.portal_slug) {
    result.errors.push('The portal must be enabled with a URL set before inviting clients.')
    return result
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, portal_status')
    .eq('organisation_id', orgId)
    .in('id', clientIds)

  if (!clients?.length) {
    result.errors.push('No valid clients found.')
    return result
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  for (const client of clients) {
    if (!client.email) {
      result.failed++
      result.errors.push(`${client.first_name} ${client.last_name} has no email address.`)
      continue
    }
    if (client.portal_status === 'active') {
      // Already active — skip silently
      continue
    }

    // Expire outstanding invites
    await supabase
      .from('client_portal_invitations')
      .delete()
      .eq('client_id', client.id)
      .is('used_at', null)

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('client_portal_invitations')
      .insert({
        organisation_id: orgId,
        client_id:       client.id,
        email:           client.email,
        created_by:      userId,
      })
      .select('token, expires_at')
      .single()

    if (inviteError || !invitation) {
      result.failed++
      result.errors.push(`Failed to create invitation for ${client.first_name} ${client.last_name}.`)
      continue
    }

    // Update status
    await supabase
      .from('clients')
      .update({ portal_status: 'invited', portal_invited_at: new Date().toISOString() })
      .eq('id', client.id)

    // Send email
    const activationUrl = `${appUrl}/portal/${settings.portal_slug}/invite/${invitation.token}`
    const { error: emailError } = await sendPortalInvitationEmail({
      clientEmail:     client.email,
      clientFirstName: client.first_name,
      orgName:         org.name,
      orgBrandColor:   org.brand_color,
      orgLogoUrl:      org.logo_url,
      activationUrl,
      expiresAt:       invitation.expires_at,
    })

    if (emailError) {
      await supabase.from('client_portal_invitations').delete().eq('token', invitation.token)
      await supabase.from('clients').update({ portal_status: 'not_invited', portal_invited_at: null }).eq('id', client.id)
      result.failed++
      result.errors.push(`Failed to send email to ${client.email}.`)
      continue
    }

    await logAuditEvent(supabase, {
      orgId,
      actorId:      userId,
      action:       'portal_invite_client',
      resourceType: 'client',
      resourceId:   client.id,
      metadata:     { email: client.email, bulk: true },
    })

    result.sent++
  }

  if (result.sent > 0) result.success = true
  return result
}
