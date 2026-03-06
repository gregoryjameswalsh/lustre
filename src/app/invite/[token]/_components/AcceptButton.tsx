'use client'

// src/app/invite/[token]/_components/AcceptButton.tsx

import { useState } from 'react'
import { acceptInvitation } from '@/lib/actions/team'

export default function AcceptButton({ token }: { token: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleAccept() {
    setPending(true)
    setError(null)
    const result = await acceptInvitation(token)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
    // On success, acceptInvitation redirects — nothing more to do here
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <button
        onClick={handleAccept}
        disabled={pending}
        className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Accepting…' : 'Accept invitation'}
      </button>
    </div>
  )
}
