// src/lib/permissions.ts
// =============================================================================
// LUSTRE — Permission helpers
//
// Usage in server actions:
//   const ctx = await requirePermission('clients:delete')
//
// Usage in UI:
//   import { hasPermission } from '@/lib/permissions'
//   if (hasPermission(permissions, 'pipeline:read')) { ... }
// =============================================================================

import { PERMISSIONS } from '@/lib/types'
export { PERMISSIONS } from '@/lib/types'
export type { Permission } from '@/lib/types'

import type { Permission } from '@/lib/types'

/** Returns true if the given permission set includes the requested permission. */
export function hasPermission(
  permissions: Permission[] | null | undefined,
  permission: Permission
): boolean {
  return (permissions ?? []).includes(permission)
}

/** The full set of permissions granted to the Admin system role. */
export const ADMIN_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[]

/** Permission groups used for the role builder UI. */
export const PERMISSION_GROUPS: Array<{
  label:       string
  permissions: Array<{ key: Permission; label: string }>
}> = [
  {
    label: 'Clients',
    permissions: [
      { key: 'clients:read',   label: 'View' },
      { key: 'clients:write',  label: 'Create & edit' },
      { key: 'clients:delete', label: 'Delete' },
    ],
  },
  {
    label: 'Jobs',
    permissions: [
      { key: 'jobs:read',   label: 'View' },
      { key: 'jobs:write',  label: 'Create & edit' },
      { key: 'jobs:delete', label: 'Delete' },
    ],
  },
  {
    label: 'Quotes',
    permissions: [
      { key: 'quotes:read',   label: 'View' },
      { key: 'quotes:write',  label: 'Create & edit' },
      { key: 'quotes:delete', label: 'Delete' },
    ],
  },
  {
    label: 'Pipeline',
    permissions: [
      { key: 'pipeline:read',   label: 'View' },
      { key: 'pipeline:write',  label: 'Create & edit' },
      { key: 'pipeline:delete', label: 'Delete' },
    ],
  },
  {
    label: 'Reports',
    permissions: [
      { key: 'reports:read', label: 'View reports & analytics' },
    ],
  },
  {
    label: 'Settings',
    permissions: [
      { key: 'settings:read',           label: 'View settings' },
      { key: 'settings:write',          label: 'Edit general settings' },
      { key: 'settings:manage_team',    label: 'Manage team members' },
      { key: 'settings:manage_roles',   label: 'Manage roles & permissions' },
      { key: 'settings:manage_billing', label: 'Manage billing' },
    ],
  },
  {
    label: 'GDPR',
    permissions: [
      { key: 'gdpr:export', label: 'Export client data (DSAR)' },
      { key: 'gdpr:erase',  label: 'Erase client data' },
    ],
  },
]
