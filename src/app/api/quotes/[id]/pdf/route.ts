// src/app/api/quotes/[id]/pdf/route.ts
// =============================================================================
// LUSTRE — Quote PDF API Route
// GET /api/quotes/[id]/pdf — returns a PDF stream
// Auth: must be logged in and belong to the same org as the quote
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { QuotePDF, QuotePDFData } from '@/lib/pdf/QuotePDF'
import { createElement } from 'react'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorised', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) return new NextResponse('Unauthorised', { status: 401 })

  // Fetch quote with all relations
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, title, status, pricing_type,
      fixed_price, subtotal, tax_rate, tax_amount, total,
      notes, valid_until, created_at,
      clients ( first_name, last_name, email, phone ),
      properties ( address_line1, address_line2, town, postcode ),
      quote_line_items ( description, quantity, unit_price, amount, is_addon, sort_order ),
      organisations ( name, email, phone, address, vat_registered, vat_number )
    `)
    .eq('id', id)
    .eq('organisation_id', profile.organisation_id)
    .single()

  if (error || !quote) return new NextResponse('Not found', { status: 404 })

  // Shape data for PDF
  const org   = Array.isArray(quote.organisations) ? quote.organisations[0] : quote.organisations
  const client = Array.isArray(quote.clients) ? quote.clients[0] : quote.clients
  const property = Array.isArray(quote.properties)
    ? quote.properties[0] ?? null
    : quote.properties ?? null

  const lineItems = (quote.quote_line_items ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((item: any) => ({
      description: item.description,
      quantity:    item.quantity,
      unitPrice:   item.unit_price,
      amount:      item.amount,
      isAddon:     item.is_addon,
    }))

  const pdfData: QuotePDFData = {
    quoteNumber:  quote.quote_number,
    title:        quote.title,
    status:       quote.status,
    pricingType:  quote.pricing_type,
    fixedPrice:   quote.fixed_price,
    subtotal:     quote.subtotal,
    taxRate:      quote.tax_rate,
    taxAmount:    quote.tax_amount,
    total:        quote.total,
    notes:        quote.notes,
    validUntil:   quote.valid_until,
    createdAt:    quote.created_at,
    vatRegistered: org?.vat_registered ?? false,
    vatNumber:    org?.vat_number ?? null,
    client: {
      firstName: client?.first_name ?? '',
      lastName:  client?.last_name ?? '',
      email:     client?.email ?? null,
      phone:     client?.phone ?? null,
    },
    property: property ? {
      addressLine1: property.address_line1,
      addressLine2: property.address_line2 ?? null,
      town:         property.town,
      postcode:     property.postcode,
    } : null,
    lineItems,
    org: {
      name:      org?.name ?? '',
      email:     org?.email ?? null,
      phone:     org?.phone ?? null,
      address:   org?.address ?? null,
      vatNumber: org?.vat_number ?? null,
    },
  }

  // Generate PDF buffer
  const buffer = await renderToBuffer(QuotePDF({ data: pdfData }))

  const filename = `${quote.quote_number}.pdf`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}