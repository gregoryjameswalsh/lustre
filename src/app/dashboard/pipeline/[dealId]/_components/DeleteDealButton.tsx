'use client'

import { useState } from 'react'
import { deleteDealAction } from '@/lib/actions/pipeline'

export default function DeleteDealButton({ dealId }: { dealId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending]       = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Delete this deal?</span>
        <button
          disabled={pending}
          onClick={async () => {
            setPending(true)
            await deleteDealAction(dealId)
          }}
          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {pending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
    >
      Delete deal
    </button>
  )
}
