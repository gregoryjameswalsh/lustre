'use server'

// src/lib/actions/quotes.ts
// =============================================================================
// LUSTRE — Quote Server Actions
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function getOrgAndUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  return { supabase, userId: user.id, profileId: profile.id, orgId: profile.organisation_id }
}

async function getOrgVat(supabase: any, orgId: string) {
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
  const { supabase, profileId, orgId } = await getOrgAndUser()

  const pricingType   = formData.get('pricing_type') as string
  const clientId      = formData.get('client_id') as string
  const propertyId    = formData.get('property_id') as string || null
  const title         = formData.get('title') as string
  const notes         = formData.get('notes') as string || null
  const internalNotes = formData.get('internal_notes') as string || null
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

  // Save line items for itemised quotes — MUST happen before redirect
  // DB trigger fires after each insert and recalculates totals on the quote
  if (pricingType === 'itemised') {
    const lineItemsJson = formData.get('line_items') as string
    if (lineItemsJson) {
      let items: any[]
      try {
        items = JSON.parse(lineItemsJson)
      } catch {
        await supabase.from('quotes').delete().eq('id', quote.id)
        return { error: 'Invalid line items data.' }
      }

      const rows = items
        .filter((item: any) => item.description?.trim())
        .map((item: any, i: number) => {
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
  const propertyId    = formData.get('property_id') as string || null
  const title         = formData.get('title') as string
  const notes         = formData.get('notes') as string || null
  const internalNotes = formData.get('internal_notes') as string || null
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
      let items: any[]
      try {
        items = JSON.parse(lineItemsJson)
      } catch {
        return { error: 'Invalid line items data.' }
      }

      await supabase.from('quote_line_items').delete().eq('quote_id', quoteId)
      const rows = items
        .filter((item: any) => item.description?.trim())
        .map((item: any, i: number) => {
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
  const { supabase, orgId } = await getOrgAndUser()

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

  if (status === 'accepted') await createJobFromQuote(quoteId)

  // Send quote email to client when owner clicks "Send to client"
  if (status === 'sent') {
    await sendQuoteToClient(quoteId, supabase)
  }

  revalidatePath(`/dashboard/quotes/${quoteId}`)
  revalidatePath('/dashboard/quotes')
  return {}
}

// -----------------------------------------------------------------------------
// Send Quote Email
// -----------------------------------------------------------------------------

async function sendQuoteToClient(quoteId: string, supabase: any): Promise<void> {
  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      quote_number, title, total, valid_until, accept_token,
      clients ( first_name, last_name, email ),
      organisations ( name, email, phone )
    `)
    .eq('id', quoteId)
    .single()

  if (!quote) return

  const clientEmail = quote.clients?.email
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
    clientName:      `${quote.clients.first_name} ${quote.clients.last_name}`,
    quoteNumber:     quote.quote_number,
    quoteTitle:      quote.title,
    quoteTotal:      quote.total,
    quoteValidUntil: quote.valid_until,
    acceptUrl:       `${appUrl}/q/${quote.accept_token}`,
    orgName:         quote.organisations.name,
    orgEmail:        quote.organisations.email,
    orgPhone:        quote.organisations.phone,
  })
}

// -----------------------------------------------------------------------------
// Create Job from Accepted Quote
// -----------------------------------------------------------------------------

async function createJobFromQuote(quoteId: string): Promise<void> {
  const { supabase, profileId } = await getOrgAndUser()

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
      assigned_to:     profileId,
      service_type:    'other',
      status:          'scheduled',
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

export async function deleteQuote(quoteId: string): Promise<{ error?: string }> {
  const { supabase, orgId } = await getOrgAndUser()

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('organisation_id', orgId)
    .eq('status', 'draft')

  if (error) return { error: 'Failed to delete quote. Only draft quotes can be deleted.' }

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
  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, created_by')
    .eq('accept_token', token)
    .single()

  if (!quote) return { error: 'Quote not found.' }
  if (quote.status !== 'sent' && quote.status !== 'viewed')
    return { error: 'This quote is no longer open for responses.' }

  const { error } = await supabase
    .from('quotes')
    .update({ status: response, responded_at: new Date().toISOString() })
    .eq('accept_token', token)

  if (error) return { error: 'Failed to record your response. Please try again.' }

  if (response === 'accepted') await createJobFromQuote(quote.id)

  return { success: true }
}

// -----------------------------------------------------------------------------
// Mark quote as viewed (called when client opens public page)
// -----------------------------------------------------------------------------

export async function markQuoteViewed(token: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('quotes')
    .update({ status: 'viewed', viewed_at: new Date().toISOString() })
    .eq('accept_token', token)
    .eq('status', 'sent')
}