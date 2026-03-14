// src/app/portal/[slug]/dashboard/invoices/page.tsx
// =============================================================================
// LUSTRE — Portal: Invoice List (Business+ gated)
// Shows the client's non-draft, non-void invoices.  Each invoice links to the
// existing public /i/[view_token] page so no new detail page is needed.
// =============================================================================

import { notFound }               from 'next/navigation'
import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import Link                       from 'next/link'
import type { PortalInvoice }     from '@/lib/types'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  sent:         { label: 'Due',          className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  viewed:       { label: 'Due',          className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  overdue:      { label: 'Overdue',      className: 'bg-red-50 text-red-700 border border-red-200' },
  paid:         { label: 'Paid',         className: 'bg-green-50 text-green-700 border border-green-200' },
  credit_note:  { label: 'Credit note',  className: 'bg-blue-50 text-blue-700 border border-blue-200' },
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PortalInvoicesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug }     = await params
  const { supabase } = await getPortalClientContext(slug)

  const { data: raw } = await supabase.rpc('portal_get_invoices', { p_org_slug: slug })

  // RPC returns an error object if invoice access is disabled
  if (raw && (raw as { error?: string }).error) {
    notFound()
  }

  const invoices = (Array.isArray(raw) ? raw : []) as PortalInvoice[]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-light tracking-tight text-zinc-900">Invoices</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Your billing history</p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No invoices yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Issued</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden md:table-cell">Due date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoices.map(inv => {
                const cfg       = STATUS_CONFIG[inv.status] ?? { label: inv.status, className: 'bg-zinc-100 text-zinc-500' }
                const outstanding = inv.total - inv.amount_paid
                return (
                  <tr key={inv.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{formatDate(inv.issued_at)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right text-zinc-800 font-medium tabular-nums">
                      {formatMoney(outstanding > 0 ? outstanding : inv.total)}
                      {outstanding > 0 && outstanding < inv.total && (
                        <span className="block text-[10px] text-zinc-400 font-normal">
                          of {formatMoney(inv.total)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`${appUrl}/i/${inv.view_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors whitespace-nowrap"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
