'use client'

// src/app/q/[token]/page.tsx
// =============================================================================
// LUSTRE — Public Quote Page
// No auth required. Token acts as the authentication mechanism.
// Called when a client clicks their quote link from an email.
// =============================================================================

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { respondToQuote, markQuoteViewed } from '@/lib/actions/quotes'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

type QuoteData = {
  id: string
  quote_number: string
  title: string
  status: string
  pricing_type: string
  fixed_price: number | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  valid_until: string | null
  accept_token: string
  responded_at: string | null
  clients: { first_name: string; last_name: string }
  properties: { address_line1: string; town: string; postcode: string } | null
  quote_line_items: { id: string; description: string; quantity: number; unit_price: number; amount: number; is_addon: boolean; sort_order: number }[]
  organisations: { name: string; phone: string | null; email: string | null; logo_url: string | null; address_line1: string | null; town: string | null; postcode: string | null }
}

export default function PublicQuotePage() {
  const params = useParams()
  const token = params.token as string
  const [quote, setQuote]       = useState<QuoteData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [response, setResponse] = useState<'accepted' | 'declined' | null>(null)
  const [acting, setActing]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
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
      .then(({ data, error }) => {
          console.log('quote fetch error:', error)
  console.log('quote fetch data:', data)
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setQuote(data as unknown as QuoteData)
        setLoading(false)

        // Mark as viewed if still in sent state
        if (data.status === 'sent') {
          markQuoteViewed(token)
        }
      })
  }, [token])

  async function handleRespond(decision: 'accepted' | 'declined') {
    setActing(true)
    setError(null)
    const result = await respondToQuote(token, decision)
    if (result.error) {
      setError(result.error)
      setActing(false)
    } else {
      setResponse(decision)
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4a5c4e] border-t-transparent" />
      </div>
    )
  }

  if (notFound || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5] px-4 text-center">
        <div>
          <p className="text-2xl font-light text-zinc-300">404</p>
          <p className="mt-2 text-sm text-zinc-400">This quote link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const org = quote.organisations
  const coreItems = quote.quote_line_items.filter(i => !i.is_addon).sort((a, b) => a.sort_order - b.sort_order)
  const addonItems = quote.quote_line_items.filter(i => i.is_addon).sort((a, b) => a.sort_order - b.sort_order)
  const alreadyResponded = quote.status === 'accepted' || quote.status === 'declined' || !!response
  const isExpired = quote.status === 'expired'

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
            Prepared for {quote.clients.first_name} {quote.clients.last_name}
            {quote.properties && ` · ${quote.properties.address_line1}, ${quote.properties.town}`}
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
        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {isExpired ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-center">
            <p className="text-sm font-medium text-amber-700">This quote has expired.</p>
            <p className="mt-1 text-xs text-amber-600">Please contact {org.name} to request an updated quote.</p>
          </div>
        ) : response === 'accepted' || quote.status === 'accepted' ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="font-medium text-emerald-700">Quote accepted</p>
            <p className="mt-1 text-sm text-emerald-600">{org.name} will be in touch to confirm your booking.</p>
          </div>
        ) : response === 'declined' || quote.status === 'declined' ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
            <p className="text-sm font-medium text-zinc-600">You've declined this quote.</p>
            <p className="mt-1 text-xs text-zinc-400">Get in touch with {org.name} if you'd like to discuss further.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
            <p className="mb-4 text-sm text-zinc-500">Ready to go ahead?</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => handleRespond('accepted')}
                disabled={acting}
                className="rounded-full bg-[#4a5c4e] px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {acting ? '…' : 'Accept quote'}
              </button>
              <button
                onClick={() => handleRespond('declined')}
                disabled={acting}
                className="text-sm text-zinc-400 underline-offset-2 hover:underline disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-zinc-300">
          Quote prepared by {org.name} using Lustre
        </p>
      </main>
    </div>
  )
}