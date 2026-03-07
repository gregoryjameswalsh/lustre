'use client'

// src/app/dashboard/settings/roles/_components/RoleForm.tsx
// Role builder — renders the name/description inputs + permission matrix.
// Submits to a server action passed as the `action` prop.

import { PERMISSION_GROUPS } from '@/lib/permissions'
import type { Permission } from '@/lib/types'
import Link from 'next/link'
import { useActionState } from 'react'

interface RoleFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | undefined>
  defaultName?:        string
  defaultDescription?: string
  defaultPermissions?: Permission[]
  submitLabel?:        string
}

export default function RoleForm({
  action,
  defaultName        = '',
  defaultDescription = '',
  defaultPermissions = [],
  submitLabel        = 'Create role',
}: RoleFormProps) {
  const [state, formAction, pending] = useActionState<{ error?: string }, FormData>(
    async (_prev, formData) => (await action(formData)) ?? {},
    {}
  )

  return (
    <form action={formAction} className="space-y-6">

      {/* Name + description */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-medium text-zinc-900">Role details</h2>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-zinc-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={50}
              defaultValue={defaultName}
              placeholder="e.g. Estimator, Field Supervisor"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#4a5c4e] focus:ring-1 focus:ring-[#4a5c4e]"
            />
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-zinc-700">
              Description
            </label>
            <input
              id="description"
              name="description"
              type="text"
              maxLength={200}
              defaultValue={defaultDescription ?? ''}
              placeholder="Optional — shown on the roles list"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#4a5c4e] focus:ring-1 focus:ring-[#4a5c4e]"
            />
          </div>
        </div>
      </div>

      {/* Permission matrix */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-medium text-zinc-900">Permissions</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Select what members with this role can do.
          </p>
        </div>
        <div className="divide-y divide-zinc-100">
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} className="px-5 py-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-3">
                {group.permissions.map(({ key, label }) => {
                  const checked = defaultPermissions.includes(key)
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={key}
                        defaultChecked={checked}
                        className="h-4 w-4 rounded border-zinc-300 accent-[#4a5c4e]"
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error + actions */}
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-xs font-medium tracking-[0.15em] uppercase text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link
          href="/dashboard/settings/roles"
          className="rounded-full border border-zinc-200 px-5 py-2.5 text-xs font-medium tracking-[0.15em] uppercase text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
