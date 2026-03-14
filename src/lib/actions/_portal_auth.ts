// src/lib/actions/_portal_auth.ts
// =============================================================================
// LUSTRE — Portal Client Authentication Helpers
//
// Mirror of _auth.ts but for the portal client session.
// Portal clients are Supabase Auth users whose auth.uid() maps to
// clients.portal_user_id rather than profiles.id.
//
// All data access goes through SECURITY DEFINER RPCs that validate ownership.
// =============================================================================

import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { PortalClientContext } from '@/lib/types'

/**
 * Returns the portal client context for the current session.
 * Redirects to the portal login if the user is not authenticated or not a
 * valid portal client for the given org slug.
 */
export async function getPortalClientContext(
  orgSlug: string
): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; context: PortalClientContext }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/portal/${orgSlug}`)

  const { data, error } = await supabase.rpc('portal_get_client_context', {
    p_org_slug: orgSlug,
  })

  if (error || !data) {
    // User is authenticated but not a portal client for this org
    redirect(`/portal/${orgSlug}`)
  }

  return { supabase, context: data as PortalClientContext }
}

/**
 * Like getPortalClientContext but does NOT redirect — returns null if
 * the user has no valid portal session.  Used by the portal home page to
 * decide whether to show the login form or redirect to the dashboard.
 */
export async function tryGetPortalClientContext(
  orgSlug: string
): Promise<PortalClientContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase.rpc('portal_get_client_context', {
      p_org_slug: orgSlug,
    })

    return (data as PortalClientContext | null) ?? null
  } catch {
    return null
  }
}
