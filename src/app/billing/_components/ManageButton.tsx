'use client'

// src/app/billing/_components/ManageButton.tsx
// Client component — POSTs to /api/billing/portal and redirects to Stripe portal.

import { useState } from 'react'

export default function ManageButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' })
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

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full border border-zinc-300 px-5 py-2 text-xs font-medium tracking-[0.12em] uppercase text-zinc-700 transition-all hover:border-zinc-500 hover:text-zinc-900 disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : 'Manage subscription'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
