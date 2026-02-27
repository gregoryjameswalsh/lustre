// src/app/dashboard/quotes/[id]/page.tsx
// =============================================================================
// LUSTRE — Quote Detail Page
// =============================================================================

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getQuote } from '@/lib/queries/quotes'
import QuoteActions from './_components/QuoteActions'
import CopyLinkInput from './_components/CopyLinkInput'

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-zinc-100 text-zinc-600',
  sent:     'bg-blue-50 text-blue-700',
  viewed:   'bg-purple-50 text-purple-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-600',
  expired:  'bg-amber-50 text-amber-700',
}

function formatCurrency(amount: number | null) {
  if (amount === null) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quote = await getQuote(id)
  if (!quote) notFound()

  const coreItems = quote.quote_line_items.filter(i => !i.is_addon).sort((a, b) => a.sort_order - b.sort_order)
  const addonItems = quote.quote_line_items.filter(i => i.is_addon).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-[#f9f8f5] p-6">
      <div className="mx-auto max-w-3xl">

        {/* Back */}
        <Link href="/dashboard/quotes" className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quotes
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">{quote.quote_number}</h1>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[quote.status]}`}>
                {quote.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{quote.title}</p>
          </div>
          <QuoteActions quote={quote} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">

          {/* Main quote content */}
          <div className="space-y-4 lg:col-span-2">

            {/* Client & property */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">Client</h2>
              <p className="font-medium text-[#0c0c0b]">
                {quote.clients.first_name} {quote.clients.last_name}
              </p>
              {quote.clients.email && <p className="text-sm text-zinc-500">{quote.clients.email}</p>}
              {quote.clients.phone && <p className="text-sm text-zinc-500">{quote.clients.phone}</p>}
              {quote.properties && (
                <p className="mt-2 text-sm text-zinc-500">
                  {quote.properties.address_line1}, {quote.properties.town} {quote.properties.postcode}
                </p>
              )}
            </div>

            {/* Line items / pricing */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">Pricing</h2>

              {quote.pricing_type === 'fixed' ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600">{quote.title}</span>
                  <span className="font-medium text-[#0c0c0b]">{formatCurrency(quote.fixed_price)}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {coreItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1.5">
                      <div>
                        <span className="text-sm text-[#0c0c0b]">{item.description}</span>
                        {item.quantity !== 1 && (
                          <span className="ml-2 text-xs text-zinc-400">× {item.quantity}</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-[#0c0c0b]">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}

                  {addonItems.length > 0 && (
                    <>
                      <div className="my-2 border-t border-dashed border-zinc-100" />
                      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Add-ons</p>
                      {addonItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-zinc-600">{item.description}</span>
                          <span className="text-sm text-zinc-600">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4">
                {quote.tax_rate > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(quote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>VAT ({quote.tax_rate}%)</span>
                      <span>{formatCurrency(quote.tax_amount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-[#0c0c0b]">Total</span>
                  <span className="text-lg font-medium text-[#0c0c0b]">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {(quote.notes || quote.internal_notes) && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5">
                {quote.notes && (
                  <div className="mb-3">
                    <h2 className="mb-1.5 text-xs font-medium uppercase tracking-widest text-zinc-400">Notes</h2>
                    <p className="whitespace-pre-wrap text-sm text-zinc-600">{quote.notes}</p>
                  </div>
                )}
                {quote.internal_notes && (
                  <div>
                    <h2 className="mb-1.5 text-xs font-medium uppercase tracking-widest text-zinc-400">Internal notes</h2>
                    <p className="whitespace-pre-wrap text-sm text-zinc-500 italic">{quote.internal_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Meta */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">Details</h2>
              <dl className="space-y-2.5">
                {[
                  { label: 'Created',    value: formatDate(quote.created_at) },
                  { label: 'Valid until', value: formatDate(quote.valid_until) },
                  { label: 'Sent',       value: formatDate(quote.sent_at) },
                  { label: 'Viewed',     value: formatDate(quote.viewed_at) },
                  { label: 'Responded',  value: formatDate(quote.responded_at) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-zinc-400">{label}</dt>
                    <dd className="text-sm text-[#0c0c0b]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Linked job */}
            {quote.job_id && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-emerald-700">Job created</h2>
                <Link
                  href={`/dashboard/jobs/${quote.job_id}`}
                  className="text-sm text-emerald-700 hover:underline"
                >
                  View linked job →
                </Link>
              </div>
            )}

            {/* Public link */}
            {['sent', 'viewed'].includes(quote.status) && (
  <div className="rounded-xl border border-zinc-200 bg-white p-5">
    <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-400">Client link</h2>
    <p className="mb-2 text-xs text-zinc-400">Share this with your client to accept or decline.</p>
    <CopyLinkInput url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/q/${quote.accept_token}`} />
  </div>
)}
          </div>
        </div>
      </div>
    </div>
  )
}