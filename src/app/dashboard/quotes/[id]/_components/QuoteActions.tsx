'use client'

// src/app/dashboard/quotes/[id]/_components/QuoteActions.tsx

import { useState } from 'react'
import { updateQuoteStatus, deleteQuote } from '@/lib/actions/quotes'

interface QuoteActionsProps {
  quoteId: string
  quoteNumber: string
  status: string
}

export default function QuoteActions({ quoteId, quoteNumber, status }: QuoteActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function handleStatus(newStatus: 'sent' | 'accepted' | 'declined' | 'expired') {
    setLoading(newStatus)
    setError(null)
    const result = await updateQuoteStatus(quoteId, newStatus)
    if (result?.error) setError(result.error)
    setLoading(null)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${quoteNumber}? This cannot be undone.`)) return
    setLoading('delete')
    setError(null)
    await deleteQuote(quoteId)
  }

  function handleDownloadPdf() {
    window.open(`/api/quotes/${quoteId}/pdf`, '_blank')
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}

      {/* PDF download — always available */}
      <button
        onClick={handleDownloadPdf}
        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
      >
        Download PDF
      </button>

      {status === 'draft' && (
        <>
          <button
            onClick={() => handleStatus('sent')}
            disabled={loading === 'sent'}
            className="rounded-full bg-[#4a5c4e] px-4 py-2 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading === 'sent' ? 'Sending…' : 'Send to client'}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading === 'delete'}
            className="rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-medium uppercase tracking-widest text-red-400 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            {loading === 'delete' ? 'Deleting…' : 'Delete'}
          </button>
        </>
      )}

      {(status === 'sent' || status === 'viewed') && (
        <>
          <button
            onClick={() => handleStatus('accepted')}
            disabled={loading === 'accepted'}
            className="rounded-full bg-[#4a5c4e] px-4 py-2 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading === 'accepted' ? 'Saving…' : 'Mark accepted'}
          </button>
          <button
            onClick={() => handleStatus('declined')}
            disabled={loading === 'declined'}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading === 'declined' ? 'Saving…' : 'Mark declined'}
          </button>
        </>
      )}

      {status === 'accepted' && (
        <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium uppercase tracking-widest text-emerald-700">Accepted</span>
      )}
      {status === 'declined' && (
        <span className="rounded-full bg-red-50 px-4 py-2 text-xs font-medium uppercase tracking-widest text-red-500">Declined</span>
      )}
      {status === 'expired' && (
        <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium uppercase tracking-widest text-zinc-400">Expired</span>
      )}
    </div>
  )
}