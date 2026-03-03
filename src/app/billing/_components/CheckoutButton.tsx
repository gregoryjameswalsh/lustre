'use client'

// src/app/billing/_components/CheckoutButton.tsx
// Client component — POSTs to /api/billing/checkout and redirects to Stripe.

import { useState } from 'react'

interface Props {
  priceId:  string | null
  label:    string
  variant?: 'primary' | 'secondary'
}

export default function CheckoutButton({ priceId, label, variant = 'secondary' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  if (!priceId) return null

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isPrimary = variant === 'primary'

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={[
          'w-full rounded-full px-6 py-2.5 text-xs font-medium tracking-[0.12em] uppercase transition-all disabled:opacity-50',
          isPrimary
            ? 'bg-[#0c0c0b] text-[#f9f8f5] hover:bg-zinc-800'
            : 'border border-zinc-300 text-zinc-700 hover:border-zinc-500 hover:text-zinc-900',
        ].join(' ')}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  )
}
