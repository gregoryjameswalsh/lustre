'use client'

// src/app/dashboard/invoices/[id]/_components/InvoiceActions.tsx

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import Link                        from 'next/link'
import { sendInvoice, voidInvoice, recordManualPayment } from '@/lib/actions/invoices'
import type { InvoiceStatus } from '@/lib/types'

interface InvoiceActionsProps {
  invoiceId:      string
  status:         InvoiceStatus
  isEditable:     boolean
  isVoidable:     boolean
  isPaid:         boolean
  publicUrl:      string
  hasClientEmail: boolean
}

export default function InvoiceActions({
  invoiceId, status, isEditable, isVoidable, isPaid, hasClientEmail,
}: InvoiceActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [voidOpen,  setVoidOpen]  = useState(false)
  const [payOpen,   setPayOpen]   = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [payAmount,  setPayAmount]  = useState('')
  const [payMethod,  setPayMethod]  = useState('bank_transfer')
  const [error, setError] = useState<string | null>(null)

  function handleSend() {
    setError(null)
    startTransition(async () => {
      const result = await sendInvoice(invoiceId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function handleVoid() {
    if (!voidReason.trim()) { setError('Please enter a reason.'); return }
    setError(null)
    startTransition(async () => {
      const result = await voidInvoice(invoiceId, voidReason)
      if (result.error) { setError(result.error); return }
      setVoidOpen(false)
      router.refresh()
    })
  }

  function handlePay() {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) { setError('Enter a valid amount.'); return }
    setError(null)
    startTransition(async () => {
      const result = await recordManualPayment(invoiceId, amount, payMethod)
      if (result.error) { setError(result.error); return }
      setPayOpen(false)
      router.refresh()
    })
  }

  const canSend = (status === 'draft' || status === 'sent' || status === 'overdue') && hasClientEmail

  return (
    <div className="flex flex-wrap gap-2">
      {error && (
        <p className="w-full text-xs text-red-600 mb-1">{error}</p>
      )}

      {isEditable && (
        <Link
          href={`/dashboard/invoices/${invoiceId}/edit`}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:border-zinc-400 transition-colors"
        >
          Edit
        </Link>
      )}

      {canSend && (
        <button
          onClick={handleSend}
          disabled={isPending}
          className="rounded-lg bg-[#1A3329] px-4 py-2 text-xs font-medium uppercase tracking-wide text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {status === 'draft' ? 'Send to client' : 'Resend'}
        </button>
      )}

      {!canSend && status === 'draft' && !hasClientEmail && (
        <span className="text-xs text-zinc-400 self-center">Client has no email — add one to send</span>
      )}

      {!isPaid && status !== 'void' && status !== 'draft' && (
        <button
          onClick={() => setPayOpen(true)}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:border-zinc-400 transition-colors"
        >
          Record payment
        </button>
      )}

      {isVoidable && (
        <button
          onClick={() => setVoidOpen(true)}
          className="rounded-lg border border-red-100 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Void
        </button>
      )}

      {/* Void modal */}
      {voidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-medium text-zinc-900 mb-1">Void invoice</h3>
            <p className="text-sm text-zinc-500 mb-4">Please provide a reason. Voided invoices cannot be reversed.</p>
            <textarea
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e] mb-4"
              rows={3}
              placeholder="Reason for voiding..."
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
            />
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setVoidOpen(false); setError(null) }}
                className="px-4 py-2 text-xs text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Void invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-medium text-zinc-900 mb-4">Record payment</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e]"
                  placeholder="0.00"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">Payment method</label>
                <select
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#4a5c4e]"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card (in-person)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setPayOpen(false); setError(null) }}
                className="px-4 py-2 text-xs text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={isPending}
                className="rounded-lg bg-[#1A3329] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Record payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
