'use client'

// src/app/dashboard/settings/team/_components/SuspendMemberButton.tsx

import { useState } from 'react'
import { setMemberSuspended } from '@/lib/actions/team'
import { useRouter } from 'next/navigation'

interface Props {
  profileId:   string
  suspended:   boolean
}

export default function SuspendMemberButton({ profileId, suspended }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const router = useRouter()

  async function handleToggle() {
    setPending(true)
    setError(null)
    const result = await setMemberSuspended(profileId, !suspended)
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
        <span className="text-xs text-zinc-400">
          {suspended ? 'Unsuspend?' : 'Suspend?'}
        </span>
        <button
          onClick={handleToggle}
          disabled={pending}
          className="text-xs font-medium text-amber-600 hover:text-amber-800 disabled:opacity-50 transition-colors"
        >
          {pending ? (suspended ? 'Unsuspending…' : 'Suspending…') : 'Yes'}
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
      className="text-xs text-zinc-300 hover:text-amber-500 transition-colors"
    >
      {suspended ? 'Unsuspend' : 'Suspend'}
    </button>
  )
}
