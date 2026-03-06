'use server'

// src/lib/actions/emailSettings.ts
// =============================================================================
// LUSTRE — Custom Email Sending Domain Actions
//
// Operators can optionally send quotes from their own domain rather than
// hello@simplylustre.com. The flow:
//
//   1. addCustomEmailDomain(formData)  — registers the domain with Resend,
//      stores resend_domain_id + email_domain_name + status='pending'.
//   2. getEmailDomainDnsRecords()      — fetches DNS records from Resend so
//      the operator can add them to their DNS provider.
//   3. verifyCustomEmailDomain()       — asks Resend to re-check DNS; if
//      verified, writes custom_from_email and flips status to 'verified'.
//   4. removeCustomEmailDomain()       — deletes the domain from Resend and
//      clears all four columns so the org reverts to the shared sender.
//
// All actions are admin-only. DNS records are always fetched on-demand from
// Resend rather than being cached in the database.
// =============================================================================

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { requireAdmin } from './_auth'
import { requiredStr } from './_validate'
import { logAuditEvent } from '@/lib/audit'

const resend = new Resend(process.env.RESEND_API_KEY)

export type EmailSettingsState = { error?: string; success?: string }

// -----------------------------------------------------------------------------
// addCustomEmailDomain
// Registers the operator's sending domain with Resend. The DNS records they
// need to add are returned so the UI can display them immediately.
// -----------------------------------------------------------------------------

export async function addCustomEmailDomain(
  _prevState: EmailSettingsState,
  formData: FormData
): Promise<EmailSettingsState & { records?: ResendDnsRecord[] }> {
  const { supabase, orgId, userId } = await requireAdmin()

  const email = requiredStr(formData, 'from_email', 254)

  // Basic email format check — also guards against header injection
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  const domain = email.split('@')[1].toLowerCase()

  // Register the domain with Resend
  const { data: resendDomain, error: resendError } = await resend.domains.create({ name: domain })

  if (resendError || !resendDomain) {
    console.error('Resend domain create error:', resendError)
    return { error: 'Could not register domain with the email provider. Please try again.' }
  }

  const { error: dbError } = await supabase
    .from('organisations')
    .update({
      resend_domain_id:    resendDomain.id,
      email_domain_name:   domain,
      email_domain_status: 'pending',
      // custom_from_email stays null until verified
    })
    .eq('id', orgId)

  if (dbError) {
    console.error('DB update error (addCustomEmailDomain):', dbError)
    // Best-effort: delete the domain from Resend to avoid orphans
    await resend.domains.remove(resendDomain.id).catch(() => null)
    return { error: 'Failed to save domain settings.' }
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'add_custom_email_domain',
    resourceType: 'organisation',
    metadata: { domain, from_email: email },
  })

  revalidatePath('/dashboard/settings')
  return { success: 'Domain registered. Add the DNS records below to your DNS provider.', records: resendDomain.records as ResendDnsRecord[] }
}

// -----------------------------------------------------------------------------
// getEmailDomainDnsRecords
// Fetches the current DNS records from Resend for the org's registered domain.
// Called by the UI when rendering the "pending" state.
// -----------------------------------------------------------------------------

export type ResendDnsRecord = {
  record: string
  name: string
  type: string
  ttl: string
  status: string
  value: string
  priority?: number
}

export async function getEmailDomainDnsRecords(): Promise<{
  records?: ResendDnsRecord[]
  error?: string
}> {
  const { supabase, orgId } = await requireAdmin()

  const { data: org } = await supabase
    .from('organisations')
    .select('resend_domain_id')
    .eq('id', orgId)
    .single()

  if (!org?.resend_domain_id) {
    return { error: 'No domain registered.' }
  }

  const { data: domain, error } = await resend.domains.get(org.resend_domain_id)

  if (error || !domain) {
    console.error('Resend domain get error:', error)
    return { error: 'Could not fetch DNS records. Please try again.' }
  }

  return { records: domain.records as ResendDnsRecord[] }
}

// -----------------------------------------------------------------------------
// verifyCustomEmailDomain
// Asks Resend to re-check DNS. If verified, writes custom_from_email.
// -----------------------------------------------------------------------------

export async function verifyCustomEmailDomain(
  _prevState: EmailSettingsState,
  formData: FormData
): Promise<EmailSettingsState> {
  const { supabase, orgId, userId } = await requireAdmin()

  const fromEmail = requiredStr(formData, 'from_email', 254)

  const { data: org } = await supabase
    .from('organisations')
    .select('resend_domain_id, email_domain_name')
    .eq('id', orgId)
    .single()

  if (!org?.resend_domain_id) {
    return { error: 'No domain registered. Please start setup again.' }
  }

  // Trigger Resend to re-check DNS
  const { error: verifyError } = await resend.domains.verify(org.resend_domain_id)
  if (verifyError) {
    console.error('Resend verify error:', verifyError)
    return { error: 'Verification request failed. Please try again shortly.' }
  }

  // Re-fetch to get the latest status
  const { data: updated, error: fetchError } = await resend.domains.get(org.resend_domain_id)
  if (fetchError || !updated) {
    return { error: 'Could not confirm verification status. Please try again.' }
  }

  if (updated.status !== 'verified') {
    return { error: "DNS records haven't propagated yet. This can take up to 48 hours — please check your DNS settings and try again." }
  }

  const { error: dbError } = await supabase
    .from('organisations')
    .update({
      email_domain_status: 'verified',
      custom_from_email:   fromEmail,
    })
    .eq('id', orgId)

  if (dbError) {
    console.error('DB update error (verifyCustomEmailDomain):', dbError)
    return { error: 'Verification confirmed but failed to save. Please try again.' }
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'verify_custom_email_domain',
    resourceType: 'organisation',
    metadata: { domain: org.email_domain_name, custom_from_email: fromEmail },
  })

  revalidatePath('/dashboard/settings')
  return { success: 'Domain verified. Quotes will now be sent from your custom address.' }
}

// -----------------------------------------------------------------------------
// removeCustomEmailDomain
// Deletes the domain from Resend and reverts the org to the shared sender.
// -----------------------------------------------------------------------------

export async function removeCustomEmailDomain(
  _prevState: EmailSettingsState,
  _formData: FormData
): Promise<EmailSettingsState> {
  const { supabase, orgId, userId } = await requireAdmin()

  const { data: org } = await supabase
    .from('organisations')
    .select('resend_domain_id, email_domain_name')
    .eq('id', orgId)
    .single()

  if (org?.resend_domain_id) {
    // Best-effort — don't fail if Resend errors (domain may already be gone)
    await resend.domains.remove(org.resend_domain_id).catch((err: unknown) => {
      console.warn('Resend domain remove warning:', err)
    })
  }

  const { error: dbError } = await supabase
    .from('organisations')
    .update({
      resend_domain_id:    null,
      email_domain_name:   null,
      email_domain_status: null,
      custom_from_email:   null,
    })
    .eq('id', orgId)

  if (dbError) {
    console.error('DB update error (removeCustomEmailDomain):', dbError)
    return { error: 'Failed to remove domain settings.' }
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'remove_custom_email_domain',
    resourceType: 'organisation',
    metadata: { domain: org?.email_domain_name ?? null },
  })

  revalidatePath('/dashboard/settings')
  return { success: 'Custom domain removed. Quotes will now be sent from hello@simplylustre.com.' }
}
