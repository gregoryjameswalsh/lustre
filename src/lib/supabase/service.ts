// src/lib/supabase/service.ts
// =============================================================================
// LUSTRE — Service-role Supabase client
//
// Uses SUPABASE_SERVICE_ROLE_KEY, which bypasses Row Level Security entirely.
// ONLY use this in server-side contexts that need cross-org access and have
// no user session — e.g. the daily cron job.
//
// NEVER import this in client components, browser code, or any context where
// the key could be exposed.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !roleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.')
  }

  return createClient(url, roleKey, {
    auth: { persistSession: false },
  })
}
