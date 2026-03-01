// src/app/q/[token]/page.tsx
// =============================================================================
// LUSTRE — Public Quote Page (Server Component)
// Data is fetched server-side with the service role client — the browser never
// touches Supabase directly, so no anon DB access is required and RLS can be
// locked down to authenticated users only.
// =============================================================================

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { markQuoteViewed } from '@/lib/actions/quotes'
import QuoteResponseButtons from './_components/QuoteResponseButtons'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PublicQuotePage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase  = createServiceClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, title, status, pricing_type,
      fixed_price, subtotal, tax_rate, tax_amount, total,
      notes, valid_until, accept_token, responded_at,
      clients ( first_name, last_name ),
      properties ( address_line1, town, postcode ),
      quote_line_items ( id, description, quantity, unit_price, amount, is_addon, sort_order ),
      organisations ( name, phone, email, logo_url, address_line1, town, postcode )
    `)
    .eq('accept_token', token)
    .single()

  if (error || !quote) notFound()

  // Mark as viewed server-side — no client-side Supabase call needed.
  if (quote.status === 'sent') {
    await markQuoteViewed(token)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org      = quote.organisations as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client   = quote.clients as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = quote.properties as any | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems = quote.quote_line_items as any[]

  const coreItems  = lineItems.filter(i => !i.is_addon).sort((a, b) => a.sort_order - b.sort_order)
  const addonItems = lineItems.filter(i =>  i.is_addon).sort((a, b) => a.sort_order - b.sort_order)
  const isExpired  = quote.status === 'expired'

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      {/* Header */}
      <header className="border-b border-zinc-100 bg-white px-6 py-5">
        <div className="mx-auto max-w-2xl">
          <p className="font-['Urbanist'] text-lg font-light tracking-widest text-[#0c0c0b]">
            {org.name}
          </p>
          {(org.phone || org.email) && (
            <p className="mt-0.5 text-xs text-zinc-400">
              {[org.phone, org.email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">

        {/* Quote header */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Quote {quote.quote_number}</p>
          <h1 className="mt-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">{quote.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Prepared for {client.first_name} {client.last_name}
            {property && ` · ${property.address_line1}, ${property.town}`}
          </p>
          {quote.valid_until && (
            <p className="mt-1 text-xs text-zinc-400">Valid until {formatDate(quote.valid_until)}</p>
          )}
        </div>

        {/* Pricing */}
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-5">
          {quote.pricing_type === 'fixed' ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600">{quote.title}</span>
              <span className="font-medium text-[#0c0c0b]">{formatCurrency(quote.fixed_price ?? 0)}</span>
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
                  <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}

              {addonItems.length > 0 && (
                <>
                  <div className="my-2 border-t border-dashed border-zinc-100" />
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Add-ons</p>
                  {addonItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-zinc-600">{item.description}</span>
                      <span className="text-sm text-zinc-500">{formatCurrency(item.amount)}</span>
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
                  <span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>VAT ({quote.tax_rate}%)</span><span>{formatCurrency(quote.tax_amount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="font-medium text-[#0c0c0b]">Total</span>
              <span className="text-xl font-medium text-[#0c0c0b]">{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-5">
            <p className="whitespace-pre-wrap text-sm text-zinc-600">{quote.notes}</p>
          </div>
        )}

        {/* Response area */}
        {isExpired ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-center">
            <p className="text-sm font-medium text-amber-700">This quote has expired.</p>
            <p className="mt-1 text-xs text-amber-600">Please contact {org.name} to request an updated quote.</p>
          </div>
        ) : (
          <QuoteResponseButtons
            token={token}
            orgName={org.name}
            initialStatus={quote.status}
          />
        )}

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-zinc-300">
          Quote prepared by {org.name} using Lustre
        </p>
      </main>
    </div>
  )
}
