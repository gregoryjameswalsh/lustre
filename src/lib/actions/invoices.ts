'use server'

// src/lib/actions/invoices.ts
// =============================================================================
// LUSTRE — Invoice Server Actions
// =============================================================================

import { revalidatePath }    from 'next/cache'
import { redirect }          from 'next/navigation'
import { getOrgAndUser }     from './_auth'
import { logAuditEvent }     from '@/lib/audit'
import { sendInvoiceEmail }  from '@/lib/email'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceFormState = { error?: string }

type LineItemInput = {
  description: string
  quantity:    number
  unit_price:  number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Default payment terms: net 30 days from issue date
function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

function calcTotals(items: LineItemInput[], taxRate: number, vatRegistered: boolean) {
  const subtotal  = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0)
  const taxAmount = vatRegistered && taxRate > 0
    ? parseFloat((subtotal * (taxRate / 100)).toFixed(2))
    : 0
  const total = parseFloat((subtotal + taxAmount).toFixed(2))
  return { subtotal: parseFloat(subtotal.toFixed(2)), taxAmount, total }
}

// ---------------------------------------------------------------------------
// createInvoice — from scratch or pre-populated from quote
// ---------------------------------------------------------------------------

export async function createInvoice(
  prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  const clientId      = formData.get('client_id') as string
  const jobId         = (formData.get('job_id') as string) || null
  const quoteId       = (formData.get('quote_id') as string) || null
  const dueDate       = (formData.get('due_date') as string) || defaultDueDate()
  const notes         = (formData.get('notes') as string)?.trim() || null
  const internalNotes = (formData.get('internal_notes') as string)?.trim() || null

  if (!clientId) return { error: 'Please select a client.' }

  // Parse line items
  const lineItemsJson = formData.get('line_items') as string
  let items: LineItemInput[] = []
  try {
    items = JSON.parse(lineItemsJson ?? '[]').filter(
      (i: LineItemInput) => i.description?.trim()
    )
  } catch {
    return { error: 'Invalid line items.' }
  }
  if (items.length === 0) return { error: 'Please add at least one line item.' }

  // Fetch VAT settings
  const { data: org } = await supabase
    .from('organisations')
    .select('vat_registered, vat_rate')
    .eq('id', orgId)
    .single()
  const vatRegistered = org?.vat_registered ?? false
  const vatRate       = org?.vat_rate       ?? 0

  const { subtotal, taxAmount, total } = calcTotals(items, vatRate, vatRegistered)

  // Generate invoice number
  const { data: invoiceNumber, error: seqError } = await supabase
    .rpc('generate_invoice_number', { p_org_id: orgId })
  if (seqError || !invoiceNumber) return { error: 'Failed to generate invoice number.' }

  // Insert invoice
  const { data: invoice, error: insertError } = await supabase
    .from('invoices')
    .insert({
      organisation_id: orgId,
      client_id:       clientId,
      job_id:          jobId,
      quote_id:        quoteId,
      invoice_number:  invoiceNumber,
      due_date:        dueDate,
      subtotal,
      tax_rate:        vatRegistered ? vatRate : 0,
      tax_amount:      taxAmount,
      total,
      notes,
      internal_notes:  internalNotes,
    })
    .select('id')
    .single()

  if (insertError || !invoice) return { error: 'Failed to create invoice.' }

  // Insert line items
  const rows = items.map((item, i) => {
    const qty   = Math.max(0.01, Number(item.quantity))
    const price = Math.max(0,    Number(item.unit_price))
    return {
      invoice_id:      invoice.id,
      organisation_id: orgId,
      description:     item.description.trim(),
      quantity:        qty,
      unit_price:      price,
      amount:          parseFloat((qty * price).toFixed(2)),
      sort_order:      i,
    }
  })

  const { error: itemsError } = await supabase.from('invoice_line_items').insert(rows)
  if (itemsError) {
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: 'Failed to save line items.' }
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'create_invoice',
    resourceType: 'invoice', resourceId: invoice.id,
    metadata: { invoice_number: invoiceNumber, total, client_id: clientId },
  })

  redirect(`/dashboard/invoices/${invoice.id}`)
}

// ---------------------------------------------------------------------------
// createInvoiceFromQuote — called programmatically on quote acceptance
// ---------------------------------------------------------------------------

export async function createInvoiceFromQuote(
  quoteId: string,
  orgId: string,
  userId: string
): Promise<{ invoiceId?: string; error?: string }> {
  const { supabase } = await getOrgAndUser()

  // Fetch quote with its line items
  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      client_id, job_id, total, subtotal, tax_rate, tax_amount, notes,
      quote_line_items ( description, quantity, unit_price, amount, sort_order )
    `)
    .eq('id', quoteId)
    .eq('organisation_id', orgId)
    .single()

  if (!quote) return { error: 'Quote not found.' }

  // Generate invoice number
  const { data: invoiceNumber, error: seqError } = await supabase
    .rpc('generate_invoice_number', { p_org_id: orgId })
  if (seqError || !invoiceNumber) return { error: 'Failed to generate invoice number.' }

  const { data: invoice, error: insertError } = await supabase
    .from('invoices')
    .insert({
      organisation_id: orgId,
      client_id:       quote.client_id,
      quote_id:        quoteId,
      invoice_number:  invoiceNumber,
      due_date:        defaultDueDate(),
      subtotal:        quote.subtotal,
      tax_rate:        quote.tax_rate,
      tax_amount:      quote.tax_amount,
      total:           quote.total,
      notes:           quote.notes,
    })
    .select('id')
    .single()

  if (insertError || !invoice) return { error: 'Failed to create invoice from quote.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems = (quote.quote_line_items as any[]) ?? []
  if (lineItems.length > 0) {
    const rows = lineItems.map((item) => ({
      invoice_id:      invoice.id,
      organisation_id: orgId,
      description:     item.description,
      quantity:        item.quantity,
      unit_price:      item.unit_price,
      amount:          item.amount,
      sort_order:      item.sort_order,
    }))
    await supabase.from('invoice_line_items').insert(rows)
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'create_invoice',
    resourceType: 'invoice', resourceId: invoice.id,
    metadata: { invoice_number: invoiceNumber, source: 'quote', quote_id: quoteId },
  })

  return { invoiceId: invoice.id }
}

// ---------------------------------------------------------------------------
// updateInvoice — edits a draft invoice
// ---------------------------------------------------------------------------

export async function updateInvoice(
  invoiceId: string,
  prevState: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const { supabase, orgId } = await getOrgAndUser()

  // Only draft invoices are editable
  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .eq('organisation_id', orgId)
    .single()

  if (!existing) return { error: 'Invoice not found.' }
  if (existing.status !== 'draft') return { error: 'Only draft invoices can be edited.' }

  const dueDate       = (formData.get('due_date') as string) || defaultDueDate()
  const notes         = (formData.get('notes') as string)?.trim() || null
  const internalNotes = (formData.get('internal_notes') as string)?.trim() || null

  const lineItemsJson = formData.get('line_items') as string
  let items: LineItemInput[] = []
  try {
    items = JSON.parse(lineItemsJson ?? '[]').filter((i: LineItemInput) => i.description?.trim())
  } catch {
    return { error: 'Invalid line items.' }
  }
  if (items.length === 0) return { error: 'Please add at least one line item.' }

  const { data: org } = await supabase
    .from('organisations')
    .select('vat_registered, vat_rate')
    .eq('id', orgId)
    .single()
  const vatRegistered = org?.vat_registered ?? false
  const vatRate       = org?.vat_rate       ?? 0

  const { subtotal, taxAmount, total } = calcTotals(items, vatRate, vatRegistered)

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      due_date:       dueDate,
      subtotal,
      tax_rate:       vatRegistered ? vatRate : 0,
      tax_amount:     taxAmount,
      total,
      notes,
      internal_notes: internalNotes,
    })
    .eq('id', invoiceId)
    .eq('organisation_id', orgId)

  if (updateError) return { error: 'Failed to update invoice.' }

  // Replace line items
  await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId)
  const rows = items.map((item, i) => {
    const qty   = Math.max(0.01, Number(item.quantity))
    const price = Math.max(0,    Number(item.unit_price))
    return {
      invoice_id:      invoiceId,
      organisation_id: orgId,
      description:     item.description.trim(),
      quantity:        qty,
      unit_price:      price,
      amount:          parseFloat((qty * price).toFixed(2)),
      sort_order:      i,
    }
  })
  await supabase.from('invoice_line_items').insert(rows)

  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  redirect(`/dashboard/invoices/${invoiceId}`)
}

// ---------------------------------------------------------------------------
// sendInvoice — transitions draft → sent, sends email to client
// ---------------------------------------------------------------------------

export async function sendInvoice(invoiceId: string): Promise<InvoiceFormState> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total, due_date, view_token, status, notes,
      clients ( first_name, last_name, email ),
      organisations ( name, email, phone, custom_from_email )
    `)
    .eq('id', invoiceId)
    .eq('organisation_id', orgId)
    .single()

  if (!invoice) return { error: 'Invoice not found.' }
  if (!['draft', 'overdue'].includes(invoice.status) && invoice.status !== 'sent') {
    return { error: 'This invoice cannot be sent.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = invoice.clients as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org    = invoice.organisations as any

  if (!client?.email) return { error: 'Client has no email address.' }

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const invoiceUrl = `${appUrl}/i/${invoice.view_token}`

  // Send email
  await sendInvoiceEmail({
    clientEmail:   client.email,
    clientName:    `${client.first_name} ${client.last_name}`.trim(),
    invoiceNumber: invoice.invoice_number,
    total:         invoice.total,
    dueDate:       invoice.due_date,
    invoiceUrl,
    orgName:       org.name,
    orgEmail:      org.email,
    orgPhone:      org.phone,
    customFromEmail: org.custom_from_email,
  })

  // Update status to 'sent' if currently 'draft'
  if (invoice.status === 'draft') {
    await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('organisation_id', orgId)
  }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'send_invoice',
    resourceType: 'invoice', resourceId: invoiceId,
    metadata: { invoice_number: invoice.invoice_number, client_email: client.email },
  })

  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  revalidatePath('/dashboard/invoices')
  return {}
}

// ---------------------------------------------------------------------------
// voidInvoice — admin only, requires reason
// ---------------------------------------------------------------------------

export async function voidInvoice(
  invoiceId: string,
  reason: string
): Promise<InvoiceFormState> {
  const { supabase, orgId, userId, isAdmin } = await getOrgAndUser()

  if (!isAdmin) return { error: 'Only admins can void invoices.' }
  if (!reason?.trim()) return { error: 'A reason is required to void an invoice.' }

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status, invoice_number')
    .eq('id', invoiceId)
    .eq('organisation_id', orgId)
    .single()

  if (!existing) return { error: 'Invoice not found.' }
  if (existing.status === 'void') return { error: 'Invoice is already void.' }
  if (existing.status === 'paid') return { error: 'Paid invoices cannot be voided directly. Issue a credit note instead.' }

  const { error } = await supabase
    .from('invoices')
    .update({
      status:      'void',
      voided_at:   new Date().toISOString(),
      void_reason: reason.trim(),
    })
    .eq('id', invoiceId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to void invoice.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'void_invoice',
    resourceType: 'invoice', resourceId: invoiceId,
    metadata: { invoice_number: existing.invoice_number, void_reason: reason.trim() },
  })

  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  revalidatePath('/dashboard/invoices')
  return {}
}

// ---------------------------------------------------------------------------
// recordManualPayment — record cash/BACS/cheque payment
// ---------------------------------------------------------------------------

export async function recordManualPayment(
  invoiceId: string,
  amount: number,
  paymentMethod: string
): Promise<InvoiceFormState> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, total, amount_paid, invoice_number')
    .eq('id', invoiceId)
    .eq('organisation_id', orgId)
    .single()

  if (!invoice) return { error: 'Invoice not found.' }
  if (invoice.status === 'paid') return { error: 'Invoice is already fully paid.' }
  if (invoice.status === 'void') return { error: 'Cannot record payment on a voided invoice.' }

  const newAmountPaid = parseFloat((Number(invoice.amount_paid) + amount).toFixed(2))
  const isFullyPaid   = newAmountPaid >= Number(invoice.total)

  const { error } = await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      status:      isFullyPaid ? 'paid' : invoice.status,
      paid_at:     isFullyPaid ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to record payment.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'record_manual_payment',
    resourceType: 'invoice', resourceId: invoiceId,
    metadata: {
      invoice_number: invoice.invoice_number,
      amount,
      payment_method: paymentMethod,
      fully_paid: isFullyPaid,
    },
  })

  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  revalidatePath('/dashboard/invoices')
  return {}
}
