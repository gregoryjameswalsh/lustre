// src/lib/queries/rbac.ts
// =============================================================================
// LUSTRE — RBAC queries
// =============================================================================

import { createClient }            from '@/lib/supabase/server'
import type { RoleWithPermissions, Permission } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRole(raw: {
  id: string
  organisation_id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  role_permissions: { permission: string }[]
}): RoleWithPermissions {
  return {
    id:              raw.id,
    organisation_id: raw.organisation_id,
    name:            raw.name,
    description:     raw.description,
    is_system:       raw.is_system,
    created_at:      raw.created_at,
    permissions:     raw.role_permissions.map(rp => rp.permission as Permission),
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getRoles(orgId: string): Promise<RoleWithPermissions[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('roles')
    .select('*, role_permissions(permission)')
    .eq('organisation_id', orgId)
    .order('is_system', { ascending: false })
    .order('name')

  if (error) throw new Error('Failed to fetch roles.')
  return (data ?? []).map(mapRole)
}

export async function getRole(
  id: string,
  orgId: string
): Promise<RoleWithPermissions | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('roles')
    .select('*, role_permissions(permission)')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  return data ? mapRole(data) : null
}

/** Member count per role — used for display purposes on the roles list. */
export async function getRoleMemberCounts(
  orgId: string
): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('custom_role_id')
    .eq('organisation_id', orgId)
    .not('custom_role_id', 'is', null)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.custom_role_id) {
      counts[row.custom_role_id] = (counts[row.custom_role_id] ?? 0) + 1
    }
  }
  return counts
}
