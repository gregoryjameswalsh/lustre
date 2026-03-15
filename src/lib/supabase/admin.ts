// src/lib/supabase/admin.ts
// =============================================================================
// LUSTRE — Supabase Service-Role (Admin) Client
//
// Uses the SERVICE_ROLE key — bypasses RLS.
// ONLY use server-side (Server Actions, Route Handlers).
// NEVER expose to the browser.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Add it to your environment to enable single-email portal invitations.'
    )
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    }
  )
}
