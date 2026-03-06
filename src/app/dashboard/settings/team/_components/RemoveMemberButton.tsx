'use client'

// src/app/dashboard/settings/team/_components/RemoveMemberButton.tsx

import { useState } from 'react'
import { removeMember } from '@/lib/actions/team'
import { useRouter } from 'next/navigation'

export default function RemoveMemberButton({ profileId }: { profileId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const router = useRouter()

  async function handleRemove() {
    setPending(true)
    setError(null)
    const result = await removeMember(profileId)
    if (result.error) {
      setError(result.error)
      setPending(false)
      setConfirming(false)
    } else {
      router.refresh()
      setPending(false)
      setConfirming(false)
    }
  }

  if (error) {
    return <span className="text-xs text-red-500">{error}</span>
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Remove?</span>
        <button
          onClick={handleRemove}
          disabled={pending}
          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Removing…' : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-zinc-300 hover:text-red-500 transition-colors"
    >
      Remove
    </button>
  )
}
