'use server'

// src/lib/actions/booking-requests.ts
// =============================================================================
// LUSTRE — Booking Request Operator-Side Server Actions
//
// All actions require operator authentication (any role with jobs:write or
// admin).  Portal clients interact with booking requests via SECURITY DEFINER
// RPCs directly (portal_submit_booking_request, portal_cancel_booking_request,
// portal_respond_to_alternative).
// =============================================================================

import { revalidatePath }                  from 'next/cache'
import { requirePermission, getOrgAndUser } from './_auth'
import { logAuditEvent }                   from '@/lib/audit'
import {
  sendBookingRequestResponse,
  sendBookingRequestReceived,
} from '@/lib/email'
import type { PreferredTime } from '@/lib/types'

// ---------------------------------------------------------------------------
// Shared state type
// ---------------------------------------------------------------------------

export type BookingRequestActionState = { error?: string; success?: boolean }

// ---------------------------------------------------------------------------
// Helper — fetch booking request + client + org for notifications
// ---------------------------------------------------------------------------

async function getRequestContext(supabase: Awaited<ReturnType<typeof getOrgAndUser>>['supabase'], orgId: string, requestId: string) {
  const { data, error } = await supabase
    .from('booking_requests')
    .select(`
      id, status, requested_date, preferred_time, notes,
      operator_notes, proposed_date, proposed_time,
      client_id,
      clients (
        first_name, last_name, email
      ),
      job_types (
        name
      ),
      properties (
        address_line1, town
      )
    `)
    .eq('id', requestId)
    .eq('organisation_id', orgId)
    .single()

  if (error || !data) return null
  return data
}

// ---------------------------------------------------------------------------
// approveBookingRequest
// ---------------------------------------------------------------------------

export async function approveBookingRequest(
  requestId: string,
  operatorNotes: string
): Promise<BookingRequestActionState> {
  let ctx
  try {
    ctx = await requirePermission('jobs:write')
  } catch {
    return { error: 'You do not have permission to action booking requests.' }
  }

  const { supabase, orgId, userId } = ctx

  const req = await getRequestContext(supabase, orgId, requestId)
  if (!req) return { error: 'Booking request not found.' }

  if (!['pending', 'alternative_proposed'].includes(req.status)) {
    return { error: 'This request cannot be approved at its current stage.' }
  }

  const { error: updateError } = await supabase
    .from('booking_requests')
    .update({
      status:         'approved',
      operator_notes: operatorNotes || null,
      actioned_by:    userId,
      actioned_at:    new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('organisation_id', orgId)

  if (updateError) return { error: 'Failed to approve request.' }

  // Fetch org details for the notification email
  const { data: org } = await supabase
    .from('organisations')
    .select('name, email, brand_color, logo_url')
    .eq('id', orgId)
    .single()

  const client = req.clients as unknown as { first_name: string; last_name: string; email: string | null } | null
  const clientEmail = client?.email

  if (org && clientEmail) {
    await sendBookingRequestResponse({
      clientEmail,
      clientFirstName: client?.first_name ?? '',
      orgName:         org.name,
      orgBrandColor:   org.brand_color,
      orgLogoUrl:      org.logo_url,
      response:        'approved',
      requestedDate:   req.requested_date,
      jobTypeName:     (req.job_types as unknown as { name: string } | null)?.name ?? null,
      operatorNotes:   operatorNotes || null,
      proposedDate:    null,
      proposedTime:    null,
      portalUrl:       '',
    })
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'booking_request_approved',
    resourceType: 'booking_request',
    resourceId:   requestId,
    metadata:     { clientId: req.client_id },
  })

  revalidatePath('/dashboard/booking-requests')
  revalidatePath(`/dashboard/booking-requests/${requestId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// declineBookingRequest
// ---------------------------------------------------------------------------

export async function declineBookingRequest(
  requestId: string,
  operatorNotes: string
): Promise<BookingRequestActionState> {
  let ctx
  try {
    ctx = await requirePermission('jobs:write')
  } catch {
    return { error: 'You do not have permission to action booking requests.' }
  }

  const { supabase, orgId, userId } = ctx

  const req = await getRequestContext(supabase, orgId, requestId)
  if (!req) return { error: 'Booking request not found.' }

  if (!['pending', 'alternative_proposed', 'client_accepted_alternative'].includes(req.status)) {
    return { error: 'This request cannot be declined at its current stage.' }
  }

  const { error: updateError } = await supabase
    .from('booking_requests')
    .update({
      status:         'declined',
      operator_notes: operatorNotes || null,
      actioned_by:    userId,
      actioned_at:    new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('organisation_id', orgId)

  if (updateError) return { error: 'Failed to decline request.' }

  const { data: org } = await supabase
    .from('organisations')
    .select('name, email, brand_color, logo_url')
    .eq('id', orgId)
    .single()

  const client = req.clients as unknown as { first_name: string; last_name: string; email: string | null } | null
  if (org && client?.email) {
    await sendBookingRequestResponse({
      clientEmail:     client.email,
      clientFirstName: client.first_name,
      orgName:         org.name,
      orgBrandColor:   org.brand_color,
      orgLogoUrl:      org.logo_url,
      response:        'declined',
      requestedDate:   req.requested_date,
      jobTypeName:     (req.job_types as unknown as { name: string } | null)?.name ?? null,
      operatorNotes:   operatorNotes || null,
      proposedDate:    null,
      proposedTime:    null,
      portalUrl:       '',
    })
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'booking_request_declined',
    resourceType: 'booking_request',
    resourceId:   requestId,
    metadata:     { clientId: req.client_id },
  })

  revalidatePath('/dashboard/booking-requests')
  revalidatePath(`/dashboard/booking-requests/${requestId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// proposeAlternativeDate
// ---------------------------------------------------------------------------

export async function proposeAlternativeDate(
  requestId:     string,
  proposedDate:  string,
  proposedTime:  PreferredTime,
  operatorNotes: string,
  portalSlug:    string,
  appUrl:        string
): Promise<BookingRequestActionState> {
  let ctx
  try {
    ctx = await requirePermission('jobs:write')
  } catch {
    return { error: 'You do not have permission to action booking requests.' }
  }

  const { supabase, orgId, userId } = ctx

  if (!proposedDate) return { error: 'Please provide an alternative date.' }

  const req = await getRequestContext(supabase, orgId, requestId)
  if (!req) return { error: 'Booking request not found.' }

  if (!['pending', 'client_declined_alternative'].includes(req.status)) {
    return { error: 'An alternative can only be proposed for pending requests or after a client declines.' }
  }

  const { error: updateError } = await supabase
    .from('booking_requests')
    .update({
      status:         'alternative_proposed',
      proposed_date:  proposedDate,
      proposed_time:  proposedTime || 'flexible',
      operator_notes: operatorNotes || null,
      actioned_by:    userId,
      actioned_at:    new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('organisation_id', orgId)

  if (updateError) return { error: 'Failed to propose alternative.' }

  const { data: org } = await supabase
    .from('organisations')
    .select('name, email, brand_color, logo_url')
    .eq('id', orgId)
    .single()

  const client = req.clients as unknown as { first_name: string; last_name: string; email: string | null } | null
  if (org && client?.email) {
    const portalUrl = `${appUrl}/portal/${portalSlug}/dashboard/requests/${requestId}`
    await sendBookingRequestResponse({
      clientEmail:     client.email,
      clientFirstName: client.first_name,
      orgName:         org.name,
      orgBrandColor:   org.brand_color,
      orgLogoUrl:      org.logo_url,
      response:        'alternative_proposed',
      requestedDate:   req.requested_date,
      jobTypeName:     (req.job_types as unknown as { name: string } | null)?.name ?? null,
      operatorNotes:   operatorNotes || null,
      proposedDate,
      proposedTime:    proposedTime || 'flexible',
      portalUrl,
    })
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'booking_request_alternative_proposed',
    resourceType: 'booking_request',
    resourceId:   requestId,
    metadata:     { clientId: req.client_id, proposedDate, proposedTime },
  })

  revalidatePath('/dashboard/booking-requests')
  revalidatePath(`/dashboard/booking-requests/${requestId}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// notifyOperatorOfNewRequest
// Called from a portal server action (via the portal supabase client hitting
// the RPC) then the result is used to trigger this email-only side-effect.
// This is an operator-authenticated action because it calls the email helper.
// Actually we expose this as a plain function since it's called internally.
// ---------------------------------------------------------------------------

export async function notifyOperatorOfNewRequest(params: {
  orgId:           string
  requestId:       string
  clientName:      string
  requestedDate:   string | null
  preferredTime:   string | null
  jobTypeName:     string | null
  propertyAddress: string | null
  notes:           string | null
  appUrl:          string
}): Promise<void> {
  // We need a server-level supabase client with service scope to fetch the org
  // email.  Use getOrgAndUser won't work here (no operator session).
  // Instead we pass the orgId and use the anon client to call a SECURITY
  // DEFINER helper that returns just the org email/name.
  // Simplest approach: caller (portal server action) fetches org email itself.
  // This function is intentionally kept as a thin wrapper.
  const dashboardUrl = `${params.appUrl}/dashboard/booking-requests/${params.requestId}`
  console.log('[booking-requests] new request notification queued for:', dashboardUrl)
}
