// src/app/api/invoices/[id]/pdf/route.ts
// =============================================================================
// LUSTRE — Invoice PDF API Route
// GET /api/invoices/[id]/pdf — returns a PDF stream (authenticated)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { renderToBuffer }            from '@react-pdf/renderer'
import { InvoicePDF, InvoicePDFData } from '@/lib/pdf/InvoicePDF'
import { checkRateLimit, pdfRateLimit } from '@/lib/ratelimit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorised', { status: 401 })

  const { success } = await checkRateLimit(pdfRateLimit, user.id)
  if (!success) return new NextResponse('Too many requests', { status: 429 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return new NextResponse('Unauthorised', { status: 401 })

  // Fetch invoice (RLS scopes to org)
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, issue_date, due_date, status,
      subtotal, tax_rate, tax_amount, total, amount_paid, currency, notes,
      clients ( first_name, last_name, email, phone ),
      invoice_line_items ( description, quantity, unit_price, amount, sort_order ),
      organisations ( name, email, phone, address, vat_registered, vat_number, logo_url, brand_color )
    `)
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)
    .single()

  if (error || !invoice) return new NextResponse('Not found', { status: 404 })

  const org    = Array.isArray(invoice.organisations) ? invoice.organisations[0] : invoice.organisations
  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients

  type LineItemRow = { description: string; quantity: number; unit_price: number; amount: number; sort_order: number }
  const lineItems = (invoice.invoice_line_items ?? [])
    .sort((a: LineItemRow, b: LineItemRow) => a.sort_order - b.sort_order)
    .map((item: LineItemRow) => ({
      description: item.description,
      quantity:    item.quantity,
      unitPrice:   item.unit_price,
      amount:      item.amount,
    }))

  const pdfData: InvoicePDFData = {
    invoiceNumber: invoice.invoice_number,
    issueDate:     invoice.issue_date,
    dueDate:       invoice.due_date,
    status:        invoice.status,
    subtotal:      invoice.subtotal,
    taxRate:       invoice.tax_rate,
    taxAmount:     invoice.tax_amount,
    total:         invoice.total,
    amountPaid:    invoice.amount_paid,
    currency:      invoice.currency,
    notes:         invoice.notes,
    vatRegistered: org?.vat_registered ?? false,
    vatNumber:     org?.vat_number ?? null,
    client: {
      firstName: client?.first_name ?? '',
      lastName:  client?.last_name  ?? '',
      email:     client?.email ?? null,
      phone:     client?.phone ?? null,
    },
    lineItems,
    org: {
      name:       org?.name       ?? '',
      email:      org?.email      ?? null,
      phone:      org?.phone      ?? null,
      address:    org?.address    ?? null,
      vatNumber:  org?.vat_number ?? null,
      logoUrl:    org?.logo_url   ?? null,
      brandColor: org?.brand_color ?? null,
    },
  }

  const buffer = await renderToBuffer(InvoicePDF({ data: pdfData }))
  const safeFilename = invoice.invoice_number.replace(/[^\w\-\.]/g, '_')

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
    },
  })
}
