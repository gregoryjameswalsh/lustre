// src/app/dashboard/settings/roles/[id]/page.tsx
// =============================================================================
// LUSTRE — Edit role
// =============================================================================

import { createClient }   from '@/lib/supabase/server'
import { redirect }       from 'next/navigation'
import { notFound }       from 'next/navigation'
import { getRole }        from '@/lib/queries/rbac'
import { updateRoleAction } from '@/lib/actions/rbac'
import RoleForm           from '../_components/RoleForm'

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard/settings')

  const role = await getRole(id, profile!.organisation_id)
  if (!role) notFound()
  if (role.is_system) redirect('/dashboard/settings/roles')

  async function handleUpdate(formData: FormData) {
    'use server'
    return updateRoleAction(id, formData)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-4 sm:px-6 md:pt-16 md:pb-16">

        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Edit role</h1>
          <p className="mt-1 text-sm text-zinc-400">{role.name}</p>
        </div>

        <RoleForm
          action={handleUpdate}
          defaultName={role.name}
          defaultDescription={role.description ?? ''}
          defaultPermissions={role.permissions}
          submitLabel="Save changes"
        />

    </main>
  )
}
