'use client'

// src/app/dashboard/settings/team/_components/RevokeButton.tsx

import { useState } from 'react'
import { revokeInvitation } from '@/lib/actions/team'
import { useRouter } from 'next/navigation'

export default function RevokeButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleRevoke() {
    setPending(true)
    await revokeInvitation(id)
    router.refresh()
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={pending}
      className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Revoking…' : 'Revoke'}
    </button>
  )
}
