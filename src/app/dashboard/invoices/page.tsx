// src/app/dashboard/invoices/page.tsx
// =============================================================================
// LUSTRE — Invoice List Page
// =============================================================================

import Link            from 'next/link'
import { getInvoices } from '@/lib/queries/invoices'
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

const STATUS_FILTERS = ['all', 'draft', 'sent', 'viewed', 'paid', 'overdue', 'void']

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface InvoicesPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const { status } = await searchParams
  const statusFilter = status === 'all' || !status ? undefined : status

  const invoices = await getInvoices(statusFilter ? { status: statusFilter } : undefined)

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-8">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Invoices</h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              {invoices.length > 0 ? `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}` : 'No invoices yet'}
            </p>
          </div>
          <Link
            href="/dashboard/invoices/new"
            className="self-start rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            + New invoice
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(s => {
            const active = (s === 'all' && !statusFilter) || s === statusFilter
            return (
              <Link
                key={s}
                href={`/dashboard/invoices?status=${s}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#1A3329] text-white'
                    : 'bg-white text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </Link>
            )
          })}
        </div>

        {/* Invoice list */}
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center">
            <p className="text-zinc-400 text-sm">
              {statusFilter
                ? `No ${statusFilter} invoices.`
                : 'No invoices yet. Create your first invoice to start billing clients.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left">Client</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left">Due</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {invoices.map(inv => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const client = inv.clients as any
                  const clientName = client
                    ? `${client.first_name} ${client.last_name}`.trim()
                    : '—'

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-zinc-50 transition-colors cursor-pointer"
                      onClick={() => {/* handled by the Link */}}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="block">
                          <span className="font-medium text-zinc-900">{inv.invoice_number}</span>
                          <span className="block text-xs text-zinc-400 mt-0.5 sm:hidden">{clientName}</span>
                        </Link>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-zinc-600">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="block">{clientName}</Link>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-zinc-500">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="block">{formatDate(inv.due_date)}</Link>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="block">{formatCurrency(inv.total)}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="block">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status as InvoiceStatus] ?? ''}`}>
                            {(inv.status ?? '').replace('_', ' ')}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
