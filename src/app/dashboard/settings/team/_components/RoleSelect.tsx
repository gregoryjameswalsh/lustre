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
  const [pending, setPending] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value
    setPending(true)
    setError(null)
    const result = await updateMemberRole(profileId, newRole)
    setPending(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={pending}
        className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600 outline-none focus:border-[#4a5c4e] disabled:opacity-50 cursor-pointer"
      >
        <option value="team_member">Team member</option>
        <option value="admin">Admin</option>
      </select>
      {error && <span className="text-[10px] text-red-500 max-w-[160px] text-right">{error}</span>}
    </div>
  )
}
