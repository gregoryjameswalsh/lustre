// src/app/dashboard/settings/roles/page.tsx
// =============================================================================
// LUSTRE — Roles list (Settings › Roles)
// =============================================================================

import { createClient }        from '@/lib/supabase/server'
import { redirect }            from 'next/navigation'
import Link                    from 'next/link'
import { getRoles, getRoleMemberCounts } from '@/lib/queries/rbac'
import DeleteRoleButton        from './_components/DeleteRoleButton'

async function getData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Only admins (and users with manage_roles permission) can manage roles.
  // For simplicity during the transition window we gate on the legacy role.
  if (profile.role !== 'admin') redirect('/dashboard/settings')

  const [roles, memberCounts] = await Promise.all([
    getRoles(profile.organisation_id),
    getRoleMemberCounts(profile.organisation_id),
  ])

  return { roles, memberCounts }
}

export default async function RolesPage() {
  const { roles, memberCounts } = await getData()

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Roles</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Define what each role can do within your organisation.
            </p>
          </div>
          <Link
            href="/dashboard/settings/roles/new"
            className="mt-1 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium tracking-[0.15em] uppercase text-white hover:bg-zinc-700 transition-colors"
          >
            New role
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white">
          {roles.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-zinc-400">No roles yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {roles.map(role => {
                const count = memberCounts[role.id] ?? 0
                return (
                  <li key={role.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900">{role.name}</p>
                        {role.is_system && (
                          <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                            System
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <p className="mt-0.5 text-xs text-zinc-400">{role.description}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                        {' · '}
                        {count} member{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4">
                      {!role.is_system ? (
                        <>
                          <Link
                            href={`/dashboard/settings/roles/${role.id}`}
                            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                          >
                            Edit
                          </Link>
                          <DeleteRoleButton roleId={role.id} roleName={role.name} />
                        </>
                      ) : (
                        <span className="text-xs text-zinc-300">Read-only</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          System roles (Admin, Team Member) are managed automatically and cannot be edited or deleted.
        </p>

      </main>
    </div>
  )
}
