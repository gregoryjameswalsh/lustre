'use client'

// src/app/dashboard/settings/team/_components/RoleSelect.tsx

import { useState } from 'react'
import { updateMemberRole } from '@/lib/actions/team'
import { useRouter } from 'next/navigation'

export default function RoleSelect({
  profileId,
  currentRole,
}: {
  profileId: string
  currentRole: string
}) {
  const [selected, setSelected] = useState(currentRole)
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  const dirty = selected !== currentRole

  async function handleSave() {
    setPending(true)
    setError(null)
    const result = await updateMemberRole(profileId, selected)
    setPending(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setError(null) }}
          disabled={pending}
          className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600 outline-none focus:border-[#4a5c4e] disabled:opacity-50 cursor-pointer"
        >
          <option value="team_member">Team member</option>
          <option value="admin">Admin</option>
        </select>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={pending}
            className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      {error && <span className="text-[10px] text-red-500 max-w-[160px] text-right">{error}</span>}
    </div>
  )
}
