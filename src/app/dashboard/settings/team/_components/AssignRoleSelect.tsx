'use client'

// src/app/dashboard/settings/team/_components/AssignRoleSelect.tsx
// Dropdown that assigns a custom role to a team member.

import { useState }         from 'react'
import { useRouter }        from 'next/navigation'
import { assignMemberRoleAction } from '@/lib/actions/rbac'
import type { RoleWithPermissions } from '@/lib/types'

export default function AssignRoleSelect({
  profileId,
  currentRoleId,
  roles,
}: {
  profileId:     string
  currentRoleId: string | null
  roles:         RoleWithPermissions[]
}) {
  const [pending, setPending] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const router = useRouter()

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const roleId = e.target.value
    setPending(true)
    setError(null)
    const result = await assignMemberRoleAction(profileId, roleId)
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
        defaultValue={currentRoleId ?? ''}
        onChange={handleChange}
        disabled={pending}
        className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600 outline-none focus:border-[#4a5c4e] disabled:opacity-50 cursor-pointer max-w-[160px]"
      >
        {roles.map(role => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </select>
      {error && <span className="text-[10px] text-red-500 max-w-[160px] text-right">{error}</span>}
    </div>
  )
}
