'use client'

// src/app/dashboard/quotes/[id]/_components/QuoteActions.tsx
// =============================================================================
// LUSTRE — Quote Actions (client component)
// Handles all status-changing actions from the quote detail page.
// =============================================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateQuoteStatus, deleteQuote } from '@/lib/actions/quotes'

interface QuoteActionsProps {
  quote: {
    id: string
    status: string
    accept_token: string
  }
}

export default function QuoteActions({ quote }: QuoteActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const router = useRouter()

  async function handle(action: string) {
    setLoading(action)
    setError(null)

    let result: { error?: string } = {}

    if (action === 'delete') {
      result = await deleteQuote(quote.id)
    } else {
      result = await updateQuoteStatus(quote.id, action as 'sent' | 'accepted' | 'declined' | 'expired')
    }

    if (result?.error) {
      setError(result.error)
      setLoading(null)
    } else {
      router.refresh()
      setLoading(null)
    }
  }

  function btn(label: string, action: string, style = 'primary') {
    const styles = {
      primary:   'bg-[#4a5c4e] text-white hover:opacity-90',
      secondary: 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
      danger:    'border border-red-100 bg-red-50 text-red-600 hover:bg-red-100',
    }
    return (
      <button
        key={action}
        onClick={() => handle(action)}
        disabled={loading !== null}
        className={`rounded-full px-4 py-2 text-xs font-medium uppercase tracking-widest transition-all disabled:opacity-50 ${styles[style as keyof typeof styles]}`}
      >
        {loading === action ? '…' : label}
      </button>
    )
  }

  const { status } = quote

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {status === 'draft' && (
          <>
            {btn('Send to client', 'sent', 'primary')}
            {btn('Delete', 'delete', 'danger')}
          </>
        )}

        {(status === 'sent' || status === 'viewed') && (
          <>
            {btn('Mark accepted', 'accepted', 'primary')}
            {btn('Mark declined', 'declined', 'secondary')}
          </>
        )}

        {status === 'accepted' && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium uppercase tracking-widest text-emerald-700">
            Accepted
          </span>
        )}

        {status === 'declined' && (
          <span className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-medium uppercase tracking-widest text-red-600">
            Declined
          </span>
        )}

        {status === 'expired' && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium uppercase tracking-widest text-amber-700">
            Expired
          </span>
        )}
      </div>
    </div>
  )
}