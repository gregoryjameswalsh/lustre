'use client'

// src/app/q/[token]/_components/QuoteResponseButtons.tsx
// Interactive accept/decline UI — the only client-side piece of the public quote page.

import { useState } from 'react'
import { respondToQuote } from '@/lib/actions/quotes'

interface Props {
  token: string
  orgName: string
  initialStatus: string
}

export default function QuoteResponseButtons({ token, orgName, initialStatus }: Props) {
  const [response, setResponse] = useState<'accepted' | 'declined' | null>(null)
  const [acting, setActing]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

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

  const effectiveStatus = response ?? initialStatus

  if (effectiveStatus === 'accepted') {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <p className="font-medium text-emerald-700">Quote accepted</p>
        <p className="mt-1 text-sm text-emerald-600">{orgName} will be in touch to confirm your booking.</p>
      </div>
    )
  }

  if (effectiveStatus === 'declined') {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm font-medium text-zinc-600">You&apos;ve declined this quote.</p>
        <p className="mt-1 text-xs text-zinc-400">Get in touch with {orgName} if you&apos;d like to discuss further.</p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
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
    </>
  )
}
