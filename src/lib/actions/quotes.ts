'use server'

// src/lib/actions/quotes.ts
// =============================================================================
// LUSTRE — Quote Server Actions
// =============================================================================

import { createAnonClient } from '@/lib/supabase/anon'
import { checkRateLimit, quoteRateLimit } from '@/lib/ratelimit'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getOrgAndUser, requireAdmin } from './_auth'
import { str } from './_validate'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logAuditEvent } from '@/lib/audit'
import { createInvoiceFromQuote } from './invoices'
import { captureServerEvent } from '@/lib/posthog'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function getOrgVat(supabase: SupabaseClient, orgId: string) {
  const { data: org } = await supabase
    .from('organisations')
    .select('vat_registered, vat_rate')
    .eq('id', orgId)
    .single()
  return {
    vatRegistered: org?.vat_registered ?? false,
    vatRate:       org?.vat_rate ?? 0,
  }
}

type LineItemInput = { description: string; quantity: number; unit_price: number; is_addon: boolean }

function calcTotals(totalIncVat: number, vatRate: number, vatRegistered: boolean) {
  if (!vatRegistered || vatRate === 0) {
    return { subtotal: totalIncVat, taxAmount: 0, total: totalIncVat }
  }
  const subtotal  = parseFloat((totalIncVat / (1 + vatRate / 100)).toFixed(2))
  const taxAmount = parseFloat((totalIncVat - subtotal).toFixed(2))
  return { subtotal, taxAmount, total: totalIncVat }
}

// -----------------------------------------------------------------------------
// Create Quote
// -----------------------------------------------------------------------------

export type QuoteFormState = { error?: string }

export async function createQuote(
  prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const { supabase, profileId, orgId, userId } = await getOrgAndUser()

  const pricingType   = formData.get('pricing_type') as string
  const clientId      = formData.get('client_id') as string
  const propertyId    = str(formData, 'property_id', 36)
  const title         = str(formData, 'title', 200)
  const notes         = str(formData, 'notes', 10000)
  const internalNotes = str(formData, 'internal_notes', 10000)
  const validUntil    = formData.get('valid_until') as string || null
  const fixedPrice    = pricingType === 'fixed'
    ? parseFloat(formData.get('fixed_price') as string || '0')
    : null

  if (!clientId) return { error: 'Please select a client.' }
  if (!title?.trim()) return { error: 'Please enter a quote title.' }
  if (pricingType === 'fixed' && (!fixedPrice || fixedPrice <= 0))
    return { error: 'Please enter a price greater than zero.' }

  const { vatRegistered, vatRate } = await getOrgVat(supabase, orgId)

  const { data: quoteNumberData, error: seqError } = await supabase
    .rpc('next_quote_number', { org_id: orgId })

  if (seqError || !quoteNumberData) return { error: 'Failed to generate quote number.' }

  const { subtotal, taxAmount, total } = pricingType === 'fixed'
    ? calcTotals(fixedPrice!, vatRate, vatRegistered)
    : { subtotal: 0, taxAmount: 0, total: 0 }

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      organisation_id: orgId,
      client_id:       clientId,
      property_id:     propertyId,
      created_by:      profileId,
      quote_number:    quoteNumberData,
      title:           title.trim(),
      pricing_type:    pricingType,
      fixed_price:     fixedPrice,
      subtotal,
      tax_rate:        vatRegistered ? vatRate : 0,
      tax_amount:      taxAmount,
      total,
      notes,
      internal_notes:  internalNotes,
      valid_until:     validUntil || null,
    })
    .select('id')
    .single()

  if (error) return { error: 'Failed to create quote. Please try again.' }

  await captureServerEvent({
    distinctId: userId,
    event:      'quote_created',
    properties: { pricing_type: pricingType, total },
  })

  // Save line items for itemised quotes — MUST happen before redirect
  // DB trigger fires after each insert and recalculates totals on the quote
  if (pricingType === 'itemised') {
    const lineItemsJson = formData.get('line_items') as string
    if (lineItemsJson) {
      let items: LineItemInput[]
      try {
        items = JSON.parse(lineItemsJson)
      } catch {
        await supabase.from('quotes').delete().eq('id', quote.id)
        return { error: 'Invalid line items data.' }
      }

      const rows = items
        .filter((item: LineItemInput) => item.description?.trim())
        .map((item: LineItemInput, i: number) => {
          const qty   = Number(item.quantity)
          const price = Number(item.unit_price)
          const safeQty   = Number.isFinite(qty)   && qty   > 0 && qty   <= 9999   ? qty   : 1
          const safePrice = Number.isFinite(price) && price >= 0 && price <= 999999 ? price : 0
          return {
            quote_id:        quote.id,
            organisation_id: orgId,
            description:     item.description.trim(),
            quantity:        safeQty,
            unit_price:      safePrice,
            amount:          parseFloat((safeQty * safePrice).toFixed(2)),
            is_addon:        item.is_addon || false,
            sort_order:      i,
          }
        })

      if (rows.length > 0) {
        const { error: itemsError } = await supabase
          .from('quote_line_items')
          .insert(rows)
        if (itemsError) {
          await supabase.from('quotes').delete().eq('id', quote.id)
          return { error: 'Failed to save line items. Please try again.' }
        }
      }
    }
  }

  redirect(`/dashboard/quotes/${quote.id}`)
}

// -----------------------------------------------------------------------------
// Update Quote (edit page)
// -----------------------------------------------------------------------------

export async function updateQuote(
  quoteId: string,
  prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const { supabase, orgId } = await getOrgAndUser()

  const pricingType   = formData.get('pricing_type') as string
  const clientId      = formData.get('client_id') as string
  const propertyId    = str(formData, 'property_id', 36)
  const title         = str(formData, 'title', 200)
  const notes         = str(formData, 'notes', 10000)
  const internalNotes = str(formData, 'internal_notes', 10000)
  const validUntil    = formData.get('valid_until') as string || null
  const fixedPrice    = pricingType === 'fixed'
    ? parseFloat(formData.get('fixed_price') as string || '0')
    : null

  if (!clientId) return { error: 'Please select a client.' }
  if (!title?.trim()) return { error: 'Please enter a quote title.' }
  if (pricingType === 'fixed' && (!fixedPrice || fixedPrice <= 0))
    return { error: 'Please enter a price greater than zero.' }

  const { vatRegistered, vatRate } = await getOrgVat(supabase, orgId)

  const { subtotal, taxAmount, total } = pricingType === 'fixed'
    ? calcTotals(fixedPrice!, vatRate, vatRegistered)
    : { subtotal: 0, taxAmount: 0, total: 0 }

  const { error } = await supabase
    .from('quotes')
    .update({
      client_id:      clientId,
      property_id:    propertyId,
      title:          title.trim(),
      pricing_type:   pricingType,
      fixed_price:    fixedPrice,
      subtotal,
      tax_rate:       vatRegistered ? vatRate : 0,
      tax_amount:     taxAmount,
      total,
      notes,
      internal_notes: internalNotes,
      valid_until:    validUntil || null,
      status:         'draft',
    })
    .eq('id', quoteId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to update quote. Please try again.' }

  if (pricingType === 'itemised') {
    const lineItemsJson = formData.get('line_items') as string
    if (lineItemsJson) {
      let items: LineItemInput[]
      try {
        items = JSON.parse(lineItemsJson)
      } catch {
        return { error: 'Invalid line items data.' }
      }

      await supabase.from('quote_line_items').delete().eq('quote_id', quoteId)
      const rows = items
        .filter((item: LineItemInput) => item.description?.trim())
        .map((item: LineItemInput, i: number) => {
          const qty   = Number(item.quantity)
          const price = Number(item.unit_price)
          const safeQty   = Number.isFinite(qty)   && qty   > 0 && qty   <= 9999   ? qty   : 1
          const safePrice = Number.isFinite(price) && price >= 0 && price <= 999999 ? price : 0
          return {
            quote_id:        quoteId,
            organisation_id: orgId,
            description:     item.description.trim(),
            quantity:        safeQty,
            unit_price:      safePrice,
            amount:          parseFloat((safeQty * safePrice).toFixed(2)),
            is_addon:        item.is_addon || false,
            sort_order:      i,
          }
        })
      if (rows.length > 0) {
        const { error: itemsError } = await supabase
          .from('quote_line_items')
          .insert(rows)
        if (itemsError) return { error: 'Failed to save line items. Please try again.' }
      }
    }
  }

  redirect(`/dashboard/quotes/${quoteId}`)
}

// -----------------------------------------------------------------------------
// Save Line Items (standalone)
// -----------------------------------------------------------------------------

export async function saveLineItems(
  quoteId: string,
  items: { description: string; quantity: number; unit_price: number; is_addon: boolean; sort_order: number }[]
): Promise<{ error?: string }> {
  const { supabase, orgId } = await getOrgAndUser()

  // Verify the quote belongs to this org before modifying its line items
  const { data: owned } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('organisation_id', orgId)
    .single()
  if (!owned) return { error: 'Not found.' }

  await supabase.from('quote_line_items').delete().eq('quote_id', quoteId)
  if (items.length === 0) return {}

  const rows = items
    .filter(item => item.description?.trim())
    .map(item => ({
      quote_id:        quoteId,
      organisation_id: orgId,
      description:     item.description.trim(),
      quantity:        item.quantity,
      unit_price:      item.unit_price,
      amount:          parseFloat((item.quantity * item.unit_price).toFixed(2)),
      is_addon:        item.is_addon,
      sort_order:      item.sort_order,
    }))

  const { error } = await supabase.from('quote_line_items').insert(rows)
  if (error) return { error: 'Failed to save line items.' }

  revalidatePath(`/dashboard/quotes/${quoteId}`)
  return {}
}

// -----------------------------------------------------------------------------
// Update Quote Status
// -----------------------------------------------------------------------------

export async function updateQuoteStatus(
  quoteId: string,
  status: 'sent' | 'accepted' | 'declined' | 'expired'
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  const updates: Record<string, unknown> = { status }
  if (status === 'sent')
    updates.sent_at = new Date().toISOString()
  if (status === 'accepted' || status === 'declined')
    updates.responded_at = new Date().toISOString()

  const { error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', quoteId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to update quote status.' }

  if (status === 'accepted') {
    await captureServerEvent({ distinctId: userId, event: 'quote_accepted', properties: { quote_id: quoteId } })
    await createJobFromQuote(quoteId, supabase)
    await captureServerEvent({ distinctId: userId, event: 'job_created', properties: { from_quote: true, quote_id: quoteId } })
    // Auto-create a draft invoice from the accepted quote
    await createInvoiceFromQuote(quoteId, orgId, userId)
  }

  if (status === 'declined') {
    await captureServerEvent({ distinctId: userId, event: 'quote_declined', properties: { quote_id: quoteId } })
  }

  // Send quote email to client when owner clicks "Send to client"
  if (status === 'sent') {
    await captureServerEvent({ distinctId: userId, event: 'quote_sent', properties: { quote_id: quoteId } })
    await sendQuoteToClient(quoteId, supabase)
  }

  revalidatePath(`/dashboard/quotes/${quoteId}`)
  revalidatePath('/dashboard/quotes')
  return {}
}

// -----------------------------------------------------------------------------
// Send Quote Email
// -----------------------------------------------------------------------------

async function sendQuoteToClient(quoteId: string, supabase: SupabaseClient): Promise<void> {
  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      quote_number, title, total, valid_until, accept_token,
      clients ( first_name, last_name, email ),
      organisations ( name, email, phone, custom_from_email, logo_url, brand_color )
    `)
    .eq('id', quoteId)
    .single()

  if (!quote) return

  const client = Array.isArray(quote.clients) ? quote.clients[0] : quote.clients
  const org = Array.isArray(quote.organisations) ? quote.organisations[0] : quote.organisations
  const clientEmail = client?.email
  if (!clientEmail) {
    console.warn(`Quote ${quote.quote_number}: client has no email address, skipping send.`)
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('NEXT_PUBLIC_APP_URL is not set — cannot send quote email.')
    return
  }

  const { sendQuoteEmail } = await import('@/lib/email')
  await sendQuoteEmail({
    clientEmail,
    clientName:      `${client?.first_name} ${client?.last_name}`,
    quoteNumber:     quote.quote_number,
    quoteTitle:      quote.title,
    quoteTotal:      quote.total,
    quoteValidUntil: quote.valid_until,
    acceptUrl:       `${appUrl}/q/${quote.accept_token}`,
    orgName:         org?.name,
    orgEmail:        org?.email,
    orgPhone:        org?.phone,
    customFromEmail: org?.custom_from_email ?? undefined,
    orgLogoUrl:      org?.logo_url ?? null,
    orgBrandColor:   org?.brand_color ?? null,
  })
}

// -----------------------------------------------------------------------------
// Create Job from Accepted Quote (authenticated dashboard path only)
// -----------------------------------------------------------------------------

// Called when an authenticated admin marks a quote as accepted from the
// dashboard. Uses the session-bound client — RLS ensures the user can only
// create jobs within their own org.
// For the unauthenticated public quote flow, job creation is handled atomically
// inside the public_respond_to_quote SECURITY DEFINER DB function.
async function createJobFromQuote(quoteId: string, supabase: SupabaseClient): Promise<void> {
  const { data: quote } = await supabase
    .from('quotes')
    .select('organisation_id, client_id, property_id, total, quote_number, title')
    .eq('id', quoteId)
    .single()

  if (!quote) return

  const { data: job } = await supabase
    .from('jobs')
    .insert({
      organisation_id: quote.organisation_id,
      client_id:       quote.client_id,
      property_id:     quote.property_id,
      service_type:    'other',
      status:          'scheduled',
      scheduled_date:  new Date().toISOString().split('T')[0],
      price:           quote.total,
      notes:           `From quote ${quote.quote_number}: ${quote.title}`,
    })
    .select('id')
    .single()

  if (!job) return

  await supabase.from('quotes').update({ job_id: job.id }).eq('id', quoteId)
}

// -----------------------------------------------------------------------------
// Delete Quote (draft only)
// -----------------------------------------------------------------------------

// Admin-only — team members can create and send quotes but only admins can delete
export async function deleteQuote(quoteId: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Snapshot quote number + title before deletion
  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, title')
    .eq('id', quoteId)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('organisation_id', orgId)
    .eq('status', 'draft')

  if (error) return { error: 'Failed to delete quote. Only draft quotes can be deleted.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'delete_quote',
    resourceType: 'quote',
    resourceId: quoteId,
    metadata: quote ? { quote_number: quote.quote_number, title: quote.title } : undefined,
  })

  revalidatePath('/dashboard/quotes')
  redirect('/dashboard/quotes')
}

// -----------------------------------------------------------------------------
// Public: Client accepts or declines via token (no auth)
// -----------------------------------------------------------------------------

export async function respondToQuote(
  token: string,
  response: 'accepted' | 'declined'
): Promise<{ error?: string; success?: boolean }> {
  const { success: rateOk } = await checkRateLimit(quoteRateLimit, token)
  if (!rateOk) return { error: 'Too many requests. Please try again later.' }

  // Delegate to SECURITY DEFINER DB function — handles validation, status
  // update, and job creation atomically without requiring the service role key.
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .rpc('public_respond_to_quote', { p_token: token, p_response: response })

  if (error) {
    console.error('[respondToQuote] RPC error:', error)
    return { error: 'Failed to record your response. Please try again.' }
  }

  const result = data as { success?: boolean; error?: string }
  if (result.error) return { error: result.error }

  // Use the token as distinct_id — anonymous client, no session available
  await captureServerEvent({
    distinctId: `quote-${token}`,
    event:      response === 'accepted' ? 'quote_accepted_by_client' : 'quote_declined_by_client',
  })

  // Notify the operator — best-effort, never block or fail the response
  notifyOperatorOfResponse(supabase, token, response).catch(() => null)

  return { success: true }
}

async function notifyOperatorOfResponse(
  supabase: ReturnType<typeof createAnonClient>,
  token: string,
  response: 'accepted' | 'declined'
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return

  const { data: quoteData } = await supabase
    .rpc('public_get_quote_by_token', { p_token: token })

  if (!quoteData) return

  const q   = quoteData as Record<string, unknown>
  const org = q.organisations as Record<string, string> | null
  const cl  = q.clients      as Record<string, string> | null
  if (!org?.email || !cl) return

  const { sendOperatorResponseNotification } = await import('@/lib/email')
  await sendOperatorResponseNotification({
    orgEmail:     org.email,
    orgName:      org.name ?? '',
    clientName:   `${cl.first_name ?? ''} ${cl.last_name ?? ''}`.trim(),
    quoteNumber:  String(q.quote_number ?? ''),
    quoteTitle:   String(q.title ?? ''),
    quoteTotal:   Number(q.total ?? 0),
    response,
    dashboardUrl: `${appUrl}/dashboard/quotes/${q.id}`,
  })
}

// -----------------------------------------------------------------------------
// Mark quote as viewed (called when client opens public page)
// -----------------------------------------------------------------------------

export async function markQuoteViewed(token: string): Promise<void> {
  const supabase = createAnonClient()

  // Run the RPC and PostHog capture in parallel.
  // The RPC returns true only on the first transition (sent → viewed),
  // so we can fire the operator notification exactly once.
  const [{ data: didTransition }] = await Promise.all([
    supabase.rpc('public_mark_quote_viewed', { p_token: token }),
    captureServerEvent({ distinctId: `quote-${token}`, event: 'quote_viewed_by_client' }),
  ])

  if (didTransition) {
    notifyOperatorOfViewed(supabase, token).catch(() => null)
  }
}

async function notifyOperatorOfViewed(
  supabase: ReturnType<typeof createAnonClient>,
  token: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return

  const { data: quoteData } = await supabase
    .rpc('public_get_quote_by_token', { p_token: token })

  if (!quoteData) return

  const q   = quoteData as Record<string, unknown>
  const org = q.organisations as Record<string, string> | null
  const cl  = q.clients      as Record<string, string> | null
  if (!org?.email || !cl) return

  const { sendOperatorViewedNotification } = await import('@/lib/email')
  await sendOperatorViewedNotification({
    orgEmail:     org.email,
    orgName:      org.name ?? '',
    clientName:   `${cl.first_name ?? ''} ${cl.last_name ?? ''}`.trim(),
    quoteNumber:  String(q.quote_number ?? ''),
    quoteTitle:   String(q.title ?? ''),
    dashboardUrl: `${appUrl}/dashboard/quotes/${q.id}`,
  })
}