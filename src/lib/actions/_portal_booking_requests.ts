'use server'

// src/lib/actions/_portal_booking_requests.ts
// =============================================================================
// LUSTRE — Portal Booking Request Server Actions (Client-Side)
//
// These are called from portal pages by authenticated portal clients.
// All data manipulation goes through SECURITY DEFINER RPCs.
// Operator notification emails are fired as a side-effect after the RPC.
// =============================================================================

import { redirect }          from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { sendBookingRequestReceived } from '@/lib/email'

export type PortalBookingRequestState = {
  error?:   string
  success?: boolean
  id?:      string
}

// ---------------------------------------------------------------------------
// submitBookingRequest
// Called by the new-request form on /portal/[slug]/dashboard/requests/new
// ---------------------------------------------------------------------------

export async function submitBookingRequest(
  orgSlug:      string,
  prevState:    PortalBookingRequestState,
  formData:     FormData
): Promise<PortalBookingRequestState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/portal/${orgSlug}`)

  const propertyId     = formData.get('property_id') as string | null
  const jobTypeId      = formData.get('job_type_id') as string | null
  const requestedDate  = formData.get('requested_date') as string | null
  const preferredTime  = formData.get('preferred_time') as string | null
  const notes          = formData.get('notes') as string | null

  if (!requestedDate) {
    return { error: 'Please select a preferred date.' }
  }

  const { data, error } = await supabase.rpc('portal_submit_booking_request', {
    p_org_slug:       orgSlug,
    p_property_id:    propertyId   || null,
    p_job_type_id:    jobTypeId    || null,
    p_requested_date: requestedDate,
    p_preferred_time: preferredTime || 'flexible',
    p_notes:          notes?.trim() || null,
  })

  if (error || (data as { error?: string })?.error) {
    return { error: (data as { error?: string })?.error ?? 'Failed to submit request. Please try again.' }
  }

  const newId = (data as { id?: string })?.id

  // Notify the operator by email (fire-and-forget)
  // We need the org's contact email — fetch via context RPC
  const { data: ctxRaw } = await supabase.rpc('portal_get_client_context', { p_org_slug: orgSlug })
  const ctx = ctxRaw as {
    org_name: string
    org_id:   string
  } | null

  if (ctx && newId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    // Fetch org email (not in client context for privacy) — use the anon client
    // pattern: we already have an authenticated supabase session, so query
    // a minimal public RPC for the org contact email.
    // Simplest approach: query client_portal_settings join organisations.
    const { data: orgRow } = await supabase
      .from('client_portal_settings')
      .select('organisations ( email, name )')
      .eq('portal_slug', orgSlug)
      .maybeSingle()

    const org = (orgRow as { organisations: { email: string; name: string } | null } | null)?.organisations

    // Also fetch job type name and property address for the email
    let jobTypeName: string | null = null
    if (jobTypeId) {
      const { data: jt } = await supabase.from('job_types').select('name').eq('id', jobTypeId).maybeSingle()
      jobTypeName = (jt as { name: string } | null)?.name ?? null
    }

    let propertyAddress: string | null = null
    if (propertyId) {
      const { data: prop } = await supabase.from('properties').select('address_line1, town').eq('id', propertyId).maybeSingle()
      const p = prop as { address_line1: string; town: string | null } | null
      propertyAddress = p ? [p.address_line1, p.town].filter(Boolean).join(', ') : null
    }

    if (org) {
      await sendBookingRequestReceived({
        operatorEmail:   org.email,
        orgName:         org.name,
        clientName:      'A client',   // context doesn't expose full name — keep minimal
        requestedDate:   requestedDate,
        preferredTime:   preferredTime,
        jobTypeName,
        propertyAddress,
        notes:           notes?.trim() ?? null,
        dashboardUrl:    `${appUrl}/dashboard/booking-requests/${newId}`,
      })
    }
  }

  return { success: true, id: newId }
}
