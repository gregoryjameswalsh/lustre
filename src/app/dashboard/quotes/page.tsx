// src/app/dashboard/quotes/page.tsx
// =============================================================================
// LUSTRE — Quotes List Page
// =============================================================================

import Link from 'next/link'
import { getQuotes } from '@/lib/queries/quotes'

type QuoteRow = {
  id: string
  quote_number: string
  title: string
  total: number
  status: string
  valid_until: string | null
  created_at: string
  clients?: { first_name: string; last_name: string }[] | null
}

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-zinc-100 text-zinc-600',
  sent:     'bg-blue-50 text-blue-700',
  viewed:   'bg-purple-50 text-purple-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-600',
  expired:  'bg-amber-50 text-amber-700',
}

const STATUS_FILTERS = ['all', 'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired']

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface QuotesPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const { status } = await searchParams
  const statusFilter = status === 'all' || !status
    ? undefined
    : status

  const quotes = await getQuotes(statusFilter)

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-8">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Quotes</h1>
            <p className="mt-0.5 text-sm text-zinc-400">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/dashboard/quotes/new"
            className="self-start rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            + New quote
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(s => {
            const active = (s === 'all' && !statusFilter) || s === statusFilter
            return (
              <Link
                key={s}
                href={`/dashboard/quotes?status=${s}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#1A3329] text-white'
                    : 'bg-white text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {s}
              </Link>
            )
          })}
        </div>

        {/* Empty state */}
        {quotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            <p className="text-sm text-zinc-400">No quotes yet.</p>
            <Link
              href="/dashboard/quotes/new"
              className="mt-3 inline-block text-sm text-[#3D7A5F] hover:underline"
            >
              Create your first quote
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile cards (hidden sm+) */}
            <div className="space-y-2 sm:hidden">
              {quotes.map((quote: QuoteRow) => (
                <Link
                  key={quote.id}
                  href={`/dashboard/quotes/${quote.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900">{quote.quote_number}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-400">{quote.title}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {quote.clients?.[0]?.first_name} {quote.clients?.[0]?.last_name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-medium text-zinc-900">{formatCurrency(quote.total)}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[quote.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {quote.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">Valid until {formatDate(quote.valid_until)}</p>
                </Link>
              ))}
            </div>

            {/* Desktop table (hidden on mobile) */}
            <div className="hidden sm:block overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-zinc-400">Quote</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-zinc-400">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-zinc-400">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-zinc-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-zinc-400">Valid until</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-widest text-zinc-400">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {quotes.map((quote: QuoteRow) => (
                    <tr key={quote.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#0c0c0b]">{quote.quote_number}</span>
                        <p className="mt-0.5 text-xs text-zinc-400 truncate max-w-[180px]">{quote.title}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {quote.clients?.[0]?.first_name} {quote.clients?.[0]?.last_name}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0c0c0b]">
                        {formatCurrency(quote.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[quote.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDate(quote.valid_until)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDate(quote.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="text-xs text-[#3D7A5F] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
