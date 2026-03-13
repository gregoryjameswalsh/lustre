// src/app/i/[token]/page.tsx
// =============================================================================
// LUSTRE — Public Invoice Page (unauthenticated, token-gated)
// Mirrors the pattern used by /q/[token] for public quotes.
// =============================================================================

import type { Metadata } from 'next'
import Image              from 'next/image'
import { notFound }       from 'next/navigation'
import { createAnonClient } from '@/lib/supabase/anon'

const DEFAULT_BRAND = '#4a5c4e'

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> }
): Promise<Metadata> {
  const { token } = await params
  const supabase  = createAnonClient()
  const { data: invoiceRaw } = await supabase
    .rpc('public_get_invoice_by_token', { p_token: token })
    .single()
  if (!invoiceRaw) return { title: 'Invoice' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoiceRaw as any
  const [{ data: org }] = await Promise.all([
    supabase.from('organisations').select('name').eq('id', inv.organisation_id).single(),
  ])
  return {
    title: `Invoice ${inv.invoice_number} — ${org?.name ?? 'Lustre'}`,
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase  = createAnonClient()

  // Fetch invoice via SECURITY DEFINER function (bypasses RLS for public access)
  const { data: invoiceRaw, error } = await supabase
    .rpc('public_get_invoice_by_token', { p_token: token })
    .single()

  if (error || !invoiceRaw) notFound()

  // RPC returns SETOF invoices; cast to known shape since the generated types
  // don't reflect SECURITY DEFINER functions returning table rows.
  const invoice = invoiceRaw as {
    id: string
    organisation_id: string
    client_id: string
    invoice_number: string
    view_token: string
    status: string
    issue_date: string
    due_date: string
    subtotal: number
    tax_rate: number
    tax_amount: number
    total: number
    amount_paid: number
    currency: string
    stripe_payment_link_url: string | null
    notes: string | null
  }

  // Fetch related data using the org/client IDs from the invoice
  const [{ data: org }, { data: client }, { data: lineItems }] = await Promise.all([
    supabase
      .from('organisations')
      .select('name, email, phone, address, vat_registered, vat_number, logo_url, brand_color')
      .eq('id', invoice.organisation_id)
      .single(),
    supabase
      .from('clients')
      .select('first_name, last_name, email, phone')
      .eq('id', invoice.client_id)
      .single(),
    supabase
      .from('invoice_line_items')
      .select('description, quantity, unit_price, amount, sort_order')
      .eq('invoice_id', invoice.id)
      .order('sort_order'),
  ])

  // Mark as viewed (idempotent — DB function only fires on status = 'sent')
  if (invoice.status === 'sent') {
    await supabase.rpc('mark_invoice_viewed', { p_token: token })
  }

  const clientName  = client ? `${client.first_name} ${client.last_name}`.trim() : ''
  const isPaid      = invoice.status === 'paid'
  const isOverdue   = invoice.status === 'overdue'
  const outstanding = Math.max(0, invoice.total - invoice.amount_paid)
  const brand       = (org?.brand_color as string | null) ?? DEFAULT_BRAND

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      {/* Header */}
      <header className="border-b border-zinc-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-2xl">
          {org?.logo_url ? (
            <Image
              src={org.logo_url}
              alt={org?.name ?? ''}
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <p className="font-['Urbanist'] text-lg font-light tracking-widest text-[#0c0c0b]">
              {org?.name ?? ''}
            </p>
          )}
          {(org?.phone || org?.email) && (
            <p className="mt-0.5 text-xs text-zinc-400">
              {[org?.phone, org?.email].filter(Boolean).join('  ·  ')}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">

        {/* Status banner */}
        {isPaid && (
          <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 font-medium">
            This invoice has been paid. Thank you.
          </div>
        )}
        {isOverdue && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            This invoice is <strong>overdue</strong> — it was due on {formatDate(invoice.due_date)}.
          </div>
        )}

        {/* Invoice card */}
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">

          {/* Invoice header */}
          <div className="border-b border-zinc-100 px-6 py-5 flex justify-between items-start">
            <div>
              <p className="text-xs font-medium tracking-[0.12em] uppercase text-zinc-400 mb-1">Invoice</p>
              <p className="text-2xl font-light text-[#0c0c0b]">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">Issued {formatDate(invoice.issue_date)}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Due {formatDate(invoice.due_date)}</p>
            </div>
          </div>

          {/* Bill to */}
          <div className="border-b border-zinc-100 px-6 py-4">
            <p className="text-xs font-medium tracking-[0.10em] uppercase text-zinc-400 mb-1.5">Bill to</p>
            <p className="text-sm font-medium text-zinc-900">{clientName}</p>
            {client?.email && <p className="text-sm text-zinc-500">{client.email}</p>}
          </div>

          {/* Line items */}
          <div className="border-b border-zinc-100">
            <div className="hidden sm:grid grid-cols-12 px-6 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400 border-b border-zinc-50">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Unit price</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            {(lineItems ?? []).map((item, i) => (
              <div key={i} className="sm:grid sm:grid-cols-12 px-6 py-3 border-b border-zinc-50 last:border-0">
                <span className="col-span-6 text-sm text-zinc-800 block sm:inline">{item.description}</span>
                <span className="col-span-2 text-xs sm:text-sm text-zinc-500 text-left sm:text-center block sm:inline mt-0.5 sm:mt-0">
                  <span className="sm:hidden text-zinc-400">Qty </span>{item.quantity}
                </span>
                <span className="col-span-2 text-xs sm:text-sm text-zinc-500 text-left sm:text-right block sm:inline">
                  <span className="sm:hidden text-zinc-400">Unit </span>{formatCurrency(item.unit_price)}
                </span>
                <span className="col-span-2 text-sm font-medium text-zinc-900 text-left sm:text-right block sm:inline">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-5">
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              {invoice.tax_rate > 0 && (
                <>
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>VAT ({invoice.tax_rate}%)</span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-semibold text-zinc-900 text-base border-t border-zinc-100 pt-2">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.amount_paid > 0 && !isPaid && (
                <>
                  <div className="flex justify-between text-emerald-600">
                    <span>Amount paid</span>
                    <span>{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-red-600">
                    <span>Outstanding</span>
                    <span>{formatCurrency(outstanding)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment link (Epic 4 — placeholder slot) */}
          {invoice.stripe_payment_link_url && !isPaid && (
            <div className="border-t border-zinc-100 px-6 py-5">
              <a
                href={invoice.stripe_payment_link_url}
                style={{ backgroundColor: brand }}
                className="block w-full text-center rounded-xl px-6 py-3.5 text-sm font-medium uppercase tracking-widest text-white hover:opacity-90 transition-opacity"
              >
                Pay {formatCurrency(outstanding > 0 ? outstanding : invoice.total)} now
              </a>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-zinc-100 px-6 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Notes</p>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

        </div>

        {/* VAT registration */}
        {org?.vat_registered && org.vat_number && (
          <p className="mt-4 text-center text-xs text-zinc-400">
            VAT Registration No. {org.vat_number}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-zinc-300">Powered by Lustre</p>

      </main>
    </div>
  )
}
