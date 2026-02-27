'use client'

// src/app/dashboard/quotes/new/_components/NewQuoteForm.tsx
// =============================================================================
// LUSTRE — New Quote Form (client component)
// VAT is read from org settings — not editable per quote.
// =============================================================================

import { useActionState, useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { createQuote } from '@/lib/actions/quotes'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[#4a5c4e] px-6 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save as draft'}
    </button>
  )
}

type Client = { id: string; first_name: string; last_name: string }
type Property = { id: string; address_line1: string; town: string; postcode: string }
type LineItem = { description: string; quantity: number; unit_price: number; is_addon: boolean; sort_order: number }

function defaultValidUntil() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

interface NewQuoteFormProps {
  clients: Client[]
  vatRegistered: boolean
  vatRate: number
}

export default function NewQuoteForm({ clients, vatRegistered, vatRate }: NewQuoteFormProps) {
  const [state, formAction]               = useActionState(createQuote, {})
  const [properties, setProperties]       = useState<Property[]>([])
  const [selectedClient, setSelectedClient] = useState('')
  const [pricingType, setPricingType]     = useState<'fixed' | 'itemised'>('fixed')
  const [fixedPrice, setFixedPrice]       = useState<number>(0)
  const [lineItems, setLineItems]         = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, is_addon: false, sort_order: 0 }
  ])

  useEffect(() => {
    if (!selectedClient) { setProperties([]); return }
    const supabase = createClient()
    supabase
      .from('properties')
      .select('id, address_line1, town, postcode')
      .eq('client_id', selectedClient)
      .then(({ data }) => setProperties(data ?? []))
  }, [selectedClient])

  function updateLineItem(index: number, field: keyof LineItem, value: string | number | boolean) {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const parsed = (field === 'quantity' || field === 'unit_price')
        ? (parseFloat(value as string) || 0)
        : value
      return { ...item, [field]: parsed }
    }))
  }

  function addLineItem(isAddon = false) {
    setLineItems(prev => [
      ...prev,
      { description: '', quantity: 1, unit_price: 0, is_addon: isAddon, sort_order: prev.length }
    ])
  }

  function removeLineItem(index: number) {
    setLineItems(prev =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i }))
    )
  }

  // Live totals for display
  const itemisedSubtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const fixedSubtotal    = vatRegistered ? fixedPrice / (1 + vatRate / 100) : fixedPrice
  const fixedTax         = vatRegistered ? fixedPrice - fixedSubtotal : 0
  const itemisedTax      = vatRegistered ? itemisedSubtotal * vatRate / 100 : 0
  const itemisedTotal    = itemisedSubtotal + itemisedTax

  return (
    <div className="min-h-screen bg-[#f9f8f5] p-6">
      <div className="mx-auto max-w-2xl">

        <div className="mb-6">
          <a href="/dashboard/quotes" className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quotes
          </a>
          <h1 className="font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">New quote</h1>
        </div>

        {state.error && (
          <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="space-y-5">

          {/* Client & Property */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400">Client</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Client</label>
                <select
                  name="client_id"
                  required
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-[#0c0c0b] outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                >
                  <option value="">Select a client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
              {properties.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                    Property <span className="text-zinc-300">(optional)</span>
                  </label>
                  <select
                    name="property_id"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-[#0c0c0b] outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                  >
                    <option value="">No specific property</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address_line1}, {p.town} {p.postcode}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Quote details */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400">Details</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Title</label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Regular cleaning — 3 bed house"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Valid until</label>
                <input
                  name="valid_until"
                  type="date"
                  defaultValue={defaultValidUntil()}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-[#0c0c0b] outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">Pricing</h2>
              {vatRegistered ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">
                  VAT {vatRate}% applied
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-400">
                  No VAT
                </span>
              )}
            </div>

            {/* Toggle */}
            <div className="mb-4 flex rounded-lg border border-zinc-200 p-1">
              <input type="hidden" name="pricing_type" value={pricingType} />
              {(['fixed', 'itemised'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPricingType(type)}
                  className={`flex-1 rounded-md py-2 text-xs font-medium capitalize transition-colors ${
                    pricingType === type
                      ? 'bg-[#4a5c4e] text-white'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {type === 'fixed' ? 'Single price' : 'Itemised'}
                </button>
              ))}
            </div>

            {/* Fixed price */}
            {pricingType === 'fixed' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  {vatRegistered ? 'Total price inc. VAT (£)' : 'Price (£)'}
                </label>
                <input
                  name="fixed_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={fixedPrice || ''}
                  onChange={e => setFixedPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                />
                {vatRegistered && fixedPrice > 0 && (
                  <div className="mt-2 space-y-0.5 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                    <div className="flex justify-between">
                      <span>Subtotal (ex. VAT)</span>
                      <span>£{fixedSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({vatRate}%)</span>
                      <span>£{fixedTax.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Itemised */}
            {pricingType === 'itemised' && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_70px_90px_24px] gap-2 px-1">
                  <span className="text-xs text-zinc-400">Description</span>
                  <span className="text-xs text-zinc-400">Qty</span>
                  <span className="text-xs text-zinc-400">
                    {vatRegistered ? 'Price ex. VAT' : 'Unit price'}
                  </span>
                  <span />
                </div>

                {lineItems.map((item, i) => (
                  <div key={i}>
                    {i === lineItems.filter(x => !x.is_addon).length && lineItems.some(x => x.is_addon) && (
                      <p className="mb-1 mt-3 text-xs font-medium uppercase tracking-widest text-zinc-400">Add-ons</p>
                    )}
                    <div className="grid grid-cols-[1fr_70px_90px_24px] gap-2 items-center">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateLineItem(i, 'description', e.target.value)}
                        placeholder={item.is_addon ? 'Add-on description' : 'Service description'}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        min="0.5"
                        step="0.5"
                        onChange={e => updateLineItem(i, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-center text-[#0c0c0b] outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                      />
                      <input
                        type="number"
                        value={item.unit_price}
                        min="0"
                        step="0.01"
                        onChange={e => updateLineItem(i, 'unit_price', e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-[#0c0c0b] outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(i)}
                        className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:text-red-400 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => addLineItem(false)} className="text-xs text-[#4a5c4e] hover:underline">
                    + Add line item
                  </button>
                  <span className="text-zinc-200">|</span>
                  <button type="button" onClick={() => addLineItem(true)} className="text-xs text-zinc-400 hover:underline">
                    + Add add-on
                  </button>
                </div>

                {/* Running total */}
                <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3">
                  {vatRegistered && (
                    <>
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Subtotal</span>
                        <span>£{itemisedSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>VAT ({vatRate}%)</span>
                        <span>£{itemisedTax.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-[#0c0c0b]">Total</span>
                    <span className="text-lg font-medium text-[#0c0c0b]">£{itemisedTotal.toFixed(2)}</span>
                  </div>
                </div>

                <input type="hidden" name="line_items" value={JSON.stringify(lineItems)} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400">Notes</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Client notes <span className="text-zinc-300">(visible on quote)</span>
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="e.g. Price includes all cleaning products. Regular visits every two weeks."
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Internal notes <span className="text-zinc-300">(not shown to client)</span>
                </label>
                <textarea
                  name="internal_notes"
                  rows={2}
                  placeholder="Internal reminders, pricing rationale, etc."
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#4a5c4e] focus:ring-2 focus:ring-[#4a5c4e]/10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <a href="/dashboard/quotes" className="text-sm text-zinc-400 hover:text-zinc-600">Cancel</a>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}