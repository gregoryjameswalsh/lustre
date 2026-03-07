'use server'

// src/lib/actions/_auth.ts
// =============================================================================
// LUSTRE — Shared auth helpers for server actions
//
// getOrgAndUser()       — resolve current user + profile. Redirects to /login
//                         if unauthenticated or profile missing.
//
// requireAdmin()        — legacy binary admin check. Kept for backwards compat
//                         during the RBAC transition window.
//
// requirePermission()   — new RBAC-aware check. Admins always pass. For other
//                         roles, loads role_permissions and verifies access.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { UserRole, Permission } from '@/lib/types'

export async function getOrgAndUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organisation_id, role, custom_role_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organisation_id) redirect('/login')

  return {
    supabase,
    userId:       user.id,
    profileId:    profile.id,
    orgId:        profile.organisation_id,
    role:         profile.role as UserRole,
    customRoleId: profile.custom_role_id as string | null,
    isAdmin:      profile.role === 'admin',
  }
}

export async function requireAdmin() {
  const ctx = await getOrgAndUser()

  if (ctx.role !== 'admin') {
    throw new Error('You do not have permission to perform this action.')
  }

  return ctx
}

/**
 * RBAC-aware permission check.
 * Admins (legacy role = 'admin') always pass for backwards compatibility.
 * Other members must have the requested permission in their custom role.
 */
export async function requirePermission(permission: Permission) {
  const ctx = await getOrgAndUser()

  // Admins retain full access during the RBAC transition
  if (ctx.isAdmin) return ctx

  if (!ctx.customRoleId) {
    throw new Error('You do not have permission to perform this action.')
  }

  const { data } = await ctx.supabase
    .from('role_permissions')
    .select('permission')
    .eq('role_id', ctx.customRoleId)
    .eq('permission', permission)
    .maybeSingle()

  if (!data) {
    throw new Error('You do not have permission to perform this action.')
  }

  return ctx
}

/**
 * Load the full permission set for the current user's custom role.
 * Returns all permissions for admins.
 */
export async function getCurrentPermissions(): Promise<Permission[]> {
  const { ADMIN_PERMISSIONS } = await import('@/lib/permissions')
  const ctx = await getOrgAndUser()

  if (ctx.isAdmin) return ADMIN_PERMISSIONS

  if (!ctx.customRoleId) return []

  const { data } = await ctx.supabase
    .from('role_permissions')
    .select('permission')
    .eq('role_id', ctx.customRoleId)

  return (data ?? []).map(r => r.permission as Permission)
}
