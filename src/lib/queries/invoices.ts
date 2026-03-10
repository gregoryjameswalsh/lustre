// src/lib/queries/invoices.ts
// =============================================================================
// LUSTRE — Invoice queries (server-side, authenticated)
// =============================================================================

import { createClient }            from '@/lib/supabase/server'
import type { InvoiceWithRelations } from '@/lib/types'

const LINE_ITEMS_SELECT = `
  id, invoice_id, organisation_id,
  description, quantity, unit_price, amount, sort_order, created_at
`

const INVOICE_LIST_SELECT = `
  id, invoice_number, status, issue_date, due_date,
  subtotal, tax_rate, tax_amount, total, amount_paid, currency,
  stripe_payment_link_url, paid_at, sent_at, voided_at, void_reason,
  created_at, updated_at, view_token, quote_id, job_id,
  clients ( first_name, last_name, email, phone )
`

const INVOICE_FULL_SELECT = `
  ${INVOICE_LIST_SELECT},
  invoice_line_items ( ${LINE_ITEMS_SELECT} )
`

// List all invoices for the current organisation, newest first.
export async function getInvoices(options?: {
  status?: string
  clientId?: string
}): Promise<InvoiceWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select(INVOICE_FULL_SELECT)
    .order('created_at', { ascending: false })

  if (options?.status) query = query.eq('status', options.status)
  if (options?.clientId) query = query.eq('client_id', options.clientId)

  const { data } = await query
  return (data ?? []) as InvoiceWithRelations[]
}

// Single invoice by ID (must belong to current org — enforced by RLS).
export async function getInvoice(id: string): Promise<InvoiceWithRelations | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select(INVOICE_FULL_SELECT)
    .eq('id', id)
    .single()

  return data as InvoiceWithRelations | null
}
