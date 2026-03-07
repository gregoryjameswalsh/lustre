'use server'

// src/lib/actions/rbac.ts
// =============================================================================
// LUSTRE — RBAC server actions
// =============================================================================

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { requirePermission, requireAdmin } from './_auth'
import { logAuditEvent }  from '@/lib/audit'
import { str, requiredStr } from './_validate'
import type { Permission } from '@/lib/types'

// ---------------------------------------------------------------------------
// Create a custom role
// ---------------------------------------------------------------------------

export async function createRoleAction(formData: FormData): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('settings:manage_roles')

  const name        = requiredStr(formData, 'name', 50)
  const description = str(formData, 'description', 200)
  const permissions = formData.getAll('permissions') as Permission[]

  const { data: role, error } = await supabase
    .from('roles')
    .insert({ organisation_id: orgId, name, description, is_system: false })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'A role with this name already exists.' }
    return { error: 'Failed to create role. Please try again.' }
  }

  if (permissions.length > 0) {
    await supabase.from('role_permissions').insert(
      permissions.map(p => ({ role_id: role.id, permission: p }))
    )
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'create_role',
    resourceType: 'role',
    resourceId:   role.id,
    metadata:     { name, permissions },
  })

  revalidatePath('/dashboard/settings/roles')
  redirect('/dashboard/settings/roles')
}

// ---------------------------------------------------------------------------
// Update a custom role's name, description, and permissions
// ---------------------------------------------------------------------------

export async function updateRoleAction(
  roleId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('settings:manage_roles')

  const name        = requiredStr(formData, 'name', 50)
  const description = str(formData, 'description', 200)
  const permissions = formData.getAll('permissions') as Permission[]

  // Verify the role belongs to this org and is not a system role
  const { data: existing } = await supabase
    .from('roles')
    .select('id, is_system')
    .eq('id', roleId)
    .eq('organisation_id', orgId)
    .single()

  if (!existing) return { error: 'Role not found.' }
  if (existing.is_system) return { error: 'System roles cannot be edited.' }

  const { error: updateError } = await supabase
    .from('roles')
    .update({ name, description })
    .eq('id', roleId)

  if (updateError) {
    if (updateError.code === '23505') return { error: 'A role with this name already exists.' }
    return { error: 'Failed to update role. Please try again.' }
  }

  // Replace all permissions: delete then insert
  await supabase.from('role_permissions').delete().eq('role_id', roleId)
  if (permissions.length > 0) {
    await supabase.from('role_permissions').insert(
      permissions.map(p => ({ role_id: roleId, permission: p }))
    )
  }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'update_role',
    resourceType: 'role',
    resourceId:   roleId,
    metadata:     { name, permissions },
  })

  revalidatePath('/dashboard/settings/roles')
  revalidatePath(`/dashboard/settings/roles/${roleId}`)
  redirect('/dashboard/settings/roles')
}

// ---------------------------------------------------------------------------
// Delete a custom role
// Members assigned this role fall back to their system role (trigger handles
// custom_role_id → NULL via ON DELETE SET NULL; app layer re-assigns).
// ---------------------------------------------------------------------------

export async function deleteRoleAction(roleId: string): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('settings:manage_roles')

  const { data: role } = await supabase
    .from('roles')
    .select('id, name, is_system')
    .eq('id', roleId)
    .eq('organisation_id', orgId)
    .single()

  if (!role) return { error: 'Role not found.' }
  if (role.is_system) return { error: 'System roles cannot be deleted.' }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete role. Please try again.' }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'delete_role',
    resourceType: 'role',
    resourceId:   roleId,
    metadata:     { name: role.name },
  })

  revalidatePath('/dashboard/settings/roles')
  redirect('/dashboard/settings/roles')
}

// ---------------------------------------------------------------------------
// Assign a custom role to a team member
// ---------------------------------------------------------------------------

export async function assignMemberRoleAction(
  profileId: string,
  roleId: string
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requirePermission('settings:manage_roles')

  // Verify the target role belongs to this org
  const { data: role } = await supabase
    .from('roles')
    .select('id, name')
    .eq('id', roleId)
    .eq('organisation_id', orgId)
    .single()

  if (!role) return { error: 'Role not found.' }

  // Verify the target member belongs to this org
  const { data: member } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('organisation_id', orgId)
    .single()

  if (!member) return { error: 'Member not found.' }

  const { error } = await supabase
    .from('profiles')
    .update({ custom_role_id: roleId })
    .eq('id', profileId)

  if (error) return { error: 'Failed to assign role. Please try again.' }

  await logAuditEvent(supabase, {
    orgId,
    actorId:      userId,
    action:       'assign_member_role',
    resourceType: 'profile',
    resourceId:   profileId,
    metadata:     { role_name: role.name },
  })

  revalidatePath('/dashboard/settings/team')
  return {}
}
