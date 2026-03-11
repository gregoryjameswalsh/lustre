// src/app/dashboard/invoices/[id]/page.tsx
// =============================================================================
// LUSTRE — Invoice Detail Page
// =============================================================================

import { notFound }    from 'next/navigation'
import Link            from 'next/link'
import { getInvoice }  from '@/lib/queries/invoices'
import InvoiceActions  from './_components/InvoiceActions'
import type { InvoiceStatus } from '@/lib/types'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:       'bg-zinc-100 text-zinc-500',
  sent:        'bg-blue-50 text-blue-700',
  viewed:      'bg-purple-50 text-purple-700',
  paid:        'bg-emerald-50 text-emerald-700',
  overdue:     'bg-red-50 text-red-600',
  void:        'bg-zinc-100 text-zinc-400',
  credit_note: 'bg-amber-50 text-amber-700',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(id)
  if (!invoice) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = invoice.clients as any
  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : '—'
  const lineItems  = (invoice.invoice_line_items ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const outstanding = Math.max(0, invoice.total - invoice.amount_paid)

  const isEditable  = invoice.status === 'draft'
  const isVoidable  = !['paid', 'void'].includes(invoice.status)
  const isPaid      = invoice.status === 'paid'
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const publicUrl   = `${appUrl}/i/${invoice.view_token}`

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="mx-auto max-w-3xl px-4 pt-8 pb-8 sm:px-6 md:pt-24 md:pb-16">

        {/* Back */}
        <Link href="/dashboard/invoices" className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Invoices
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">
                {invoice.invoice_number}
              </h1>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[invoice.status]}`}>
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{clientName}</p>
          </div>

          {/* Actions (client component) */}
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            isEditable={isEditable}
            isVoidable={isVoidable}
            isPaid={isPaid}
            publicUrl={publicUrl}
            hasClientEmail={!!client?.email}
          />
        </div>

        {/* Overdue alert */}
        {invoice.status === 'overdue' && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            This invoice is overdue — due {formatDate(invoice.due_date)}.
          </div>
        )}

        {/* Details card */}
        <div className="rounded-xl border border-zinc-200 bg-white mb-4">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">Invoice details</h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1">Client</p>
              <p className="text-zinc-700">{clientName}</p>
              {client?.email && <p className="text-zinc-400 text-xs mt-0.5">{client.email}</p>}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1">Dates</p>
              <p className="text-zinc-600">Issued {formatDate(invoice.issue_date)}</p>
              <p className="text-zinc-600">Due {formatDate(invoice.due_date)}</p>
            </div>
            {invoice.quote_id && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1">Source</p>
                <Link href={`/dashboard/quotes/${invoice.quote_id}`} className="text-[#4a5c4e] underline underline-offset-2 text-sm">
                  View quote
                </Link>
              </div>
            )}
            {invoice.paid_at && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1">Paid</p>
                <p className="text-emerald-600 font-medium">{formatDate(invoice.paid_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-zinc-200 bg-white mb-4">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">Items</h2>
          </div>
          {lineItems.length === 0 ? (
            <p className="px-5 py-4 text-sm text-zinc-400">No line items.</p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {lineItems.map(item => (
                <div key={item.id} className="flex items-start justify-between px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-800">{item.description}</p>
                    {item.quantity !== 1 && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-900 pl-4">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-zinc-100 px-5 py-4">
            <div className="ml-auto max-w-xs space-y-1.5">
              {invoice.tax_rate > 0 && (
                <>
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>VAT ({invoice.tax_rate}%)</span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-semibold text-zinc-900 pt-1 border-t border-zinc-100">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.amount_paid > 0 && !isPaid && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Paid</span>
                    <span>{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-red-600">
                    <span>Outstanding</span>
                    <span>{formatCurrency(outstanding)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="rounded-xl border border-zinc-200 bg-white mb-4 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Notes</p>
            <p className="text-sm text-zinc-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Void reason */}
        {invoice.status === 'void' && invoice.void_reason && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 mb-4 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1">Void reason</p>
            <p className="text-sm text-zinc-600">{invoice.void_reason}</p>
          </div>
        )}

        {/* PDF + public link */}
        {invoice.status !== 'void' && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 flex flex-wrap gap-3">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener"
              className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
            >
              Download PDF
            </a>
            {invoice.status !== 'draft' && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener"
                className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
              >
                View public page
              </a>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
