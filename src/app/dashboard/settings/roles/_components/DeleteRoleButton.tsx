'use client'

// src/app/dashboard/settings/roles/_components/DeleteRoleButton.tsx

import { useState } from 'react'
import { deleteRoleAction } from '@/lib/actions/rbac'

export default function DeleteRoleButton({ roleId, roleName }: { roleId: string; roleName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Delete &ldquo;{roleName}&rdquo;?</span>
        <button
          disabled={pending}
          onClick={async () => {
            setPending(true)
            const result = await deleteRoleAction(roleId)
            if (result?.error) {
              setError(result.error)
              setPending(false)
              setConfirming(false)
            }
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
        {error && <span className="text-xs text-red-500">{error}</span>}
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
    >
      Delete
    </button>
  )
}
