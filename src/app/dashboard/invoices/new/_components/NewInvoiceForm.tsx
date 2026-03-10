'use client'

// src/app/dashboard/invoices/new/_components/NewInvoiceForm.tsx

import { useActionState, useState } from 'react'
import { useFormStatus }            from 'react-dom'
import Link                         from 'next/link'
import { createInvoice }            from '@/lib/actions/invoices'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#1A3329] px-6 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save as draft'}
    </button>
  )
}

type Client = { id: string; first_name: string; last_name: string; email: string | null }
type LineItem = { description: string; quantity: number; unit_price: number }

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

interface Props {
  clients:      Client[]
  vatRegistered: boolean
  vatRate:       number
  // Pre-populate from a quote or job
  preClientId?: string
  preQuoteId?:  string
  preJobId?:    string
  preItems?:    LineItem[]
  preNotes?:    string
}

export default function NewInvoiceForm({
  clients, vatRegistered, vatRate,
  preClientId, preQuoteId, preJobId, preItems, preNotes,
}: Props) {
  const [state, formAction] = useActionState(createInvoice, {})
  const [lineItems, setLineItems] = useState<LineItem[]>(
    preItems?.length ? preItems : [{ description: '', quantity: 1, unit_price: 0 }]
  )

  function addLine() {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])
  }

  function removeLine(i: number) {
    setLineItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateLine(i: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const tax      = vatRegistered && vatRate > 0 ? subtotal * (vatRate / 100) : 0
  const total    = subtotal + tax

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden pre-populate fields */}
      {preQuoteId && <input type="hidden" name="quote_id" value={preQuoteId} />}
      {preJobId   && <input type="hidden" name="job_id"   value={preJobId} />}
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems)} />

      {/* Error */}
      {state.error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Client */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
          Client *
        </label>
        <select
          name="client_id"
          defaultValue={preClientId ?? ''}
          required
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e]"
        >
          <option value="" disabled>Select a client…</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}{c.email ? ` — ${c.email}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Due date */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
          Due date *
        </label>
        <input
          type="date"
          name="due_date"
          defaultValue={defaultDueDate()}
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e]"
        />
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Line items</p>
          <button
            type="button"
            onClick={addLine}
            className="text-xs text-[#4a5c4e] underline underline-offset-2 hover:no-underline"
          >
            + Add item
          </button>
        </div>

        <div className="space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-6">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={e => updateLine(i, 'description', e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e]"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Qty"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 1)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e]"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  placeholder="Unit price"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e]"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-2">
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-zinc-300 hover:text-red-400 transition-colors text-lg leading-none"
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col items-end gap-1 text-sm">
          {vatRegistered && vatRate > 0 ? (
            <>
              <div className="flex gap-6 text-zinc-500">
                <span>Subtotal</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-6 text-zinc-500">
                <span>VAT ({vatRate}%)</span>
                <span>£{tax.toFixed(2)}</span>
              </div>
              <div className="flex gap-6 font-medium text-zinc-900">
                <span>Total</span>
                <span>£{total.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex gap-6 font-medium text-zinc-900">
              <span>Total</span>
              <span>£{total.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
          Notes (visible to client)
        </label>
        <textarea
          name="notes"
          defaultValue={preNotes ?? ''}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e] resize-none"
          placeholder="Payment terms, bank details, or any other note for the client…"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton />
        <Link href="/dashboard/invoices" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
