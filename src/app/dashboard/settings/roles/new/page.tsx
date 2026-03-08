// src/app/dashboard/settings/roles/new/page.tsx
// =============================================================================
// LUSTRE — Create new role
// =============================================================================

import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import { createRoleAction } from '@/lib/actions/rbac'
import RoleForm          from '../_components/RoleForm'

export default async function NewRolePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard/settings')

  return (
    <main className="max-w-3xl px-4 pt-8 pb-8 sm:px-6 md:px-10 md:pt-12 md:pb-12">

        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">New role</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Define a custom role with a tailored set of permissions.
          </p>
        </div>

        <RoleForm action={createRoleAction} submitLabel="Create role" />

    </main>
  )
}
