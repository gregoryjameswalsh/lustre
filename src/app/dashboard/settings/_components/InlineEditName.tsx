'use client'

// src/app/dashboard/settings/_components/InlineEditName.tsx
// =============================================================================
// LUSTRE — Inline name editor
// Shows the current name as text. An "Edit" button reveals an input field.
// On save, optimistically updates the displayed name without a page reload.
// =============================================================================

import { useState, useTransition } from 'react'
import { updateUserName } from '@/lib/actions/auth'

export default function InlineEditName({ currentName }: { currentName: string }) {
  const [editing, setEditing]       = useState(false)
  const [displayName, setDisplayName] = useState(currentName)
  const [inputValue, setInputValue]  = useState(currentName)
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const formData = new FormData()
    formData.set('full_name', trimmed)

    startTransition(async () => {
      // updateUserName follows the (prevState, formData) server-action signature
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (updateUserName as any)({}, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setDisplayName(trimmed)
        setEditing(false)
        setError(null)
      }
    })
  }

  function handleCancel() {
    setInputValue(displayName)
    setEditing(false)
    setError(null)
  }

  if (editing) {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
          maxLength={100}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0c0c0b] outline-none transition focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-[#1A3329] px-4 py-2 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-900">{displayName || '—'}</p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
      >
        Edit
      </button>
    </div>
  )
}
