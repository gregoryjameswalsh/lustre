'use client'

// src/app/dashboard/settings/_components/StripeConnectCard.tsx
// Stripe Connect — shows connection status and handles connect/disconnect.

import { useState } from 'react'

interface Props {
  connected:       boolean
  stripeAccountId: string | null
  isAdmin:         boolean
}

export default function StripeConnectCard({ connected, stripeAccountId, isAdmin }: Props) {
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleDisconnect() {
    if (!confirm('Disconnect Stripe? Existing invoices will keep their payment links, but new invoices won\'t be able to generate them.')) return
    setDisconnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/connect/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Request failed')
      window.location.reload()
    } catch {
      setError('Failed to disconnect. Please try again.')
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {connected ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-sm font-medium text-zinc-900">Connected</p>
            </div>
            {stripeAccountId && (
              <p className="mt-0.5 text-xs text-zinc-400 font-mono">{stripeAccountId}</p>
            )}
            <p className="mt-1 text-xs text-zinc-400">
              Lustre will generate payment links on your invoices and collect a 2% platform fee per transaction.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="ml-6 shrink-0 rounded-lg border border-red-100 bg-white px-4 py-2 text-xs font-medium uppercase tracking-widest text-red-400 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-zinc-500 mb-4">
            Connect your Stripe account to let clients pay invoices online.
            Lustre earns a <strong className="text-zinc-700">2% platform fee</strong> on each payment — nothing else to set up.
          </p>
          {isAdmin ? (
            <a
              href="/api/billing/connect/oauth"
              className="inline-block rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            >
              Connect Stripe account
            </a>
          ) : (
            <p className="text-xs text-zinc-400">Ask your account admin to connect Stripe.</p>
          )}
        </div>
      )}
    </div>
  )
}
