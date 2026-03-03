'use server'

// src/lib/actions/_auth.ts
// =============================================================================
// LUSTRE — Shared auth helpers for server actions
//
// getOrgAndUser()  — resolve the current user, their profile, and their role.
//                    Redirects to /login if unauthenticated or profile missing.
//
// requireAdmin()   — calls getOrgAndUser() then throws if the caller is not
//                    an admin.  Use at the top of any admin-only action.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import type { UserRole } from '@/lib/types'

export async function getOrgAndUser() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organisation_id) redirect('/login')

  return {
    supabase,
    userId:    user.id,
    profileId: profile.id,
    orgId:     profile.organisation_id,
    role:      profile.role as UserRole,
  }
}

export async function requireAdmin() {
  const ctx = await getOrgAndUser()

  if (ctx.role !== 'admin') {
    throw new Error('You do not have permission to perform this action.')
  }

  return ctx
}
