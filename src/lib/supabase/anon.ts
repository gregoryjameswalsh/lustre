// src/lib/supabase/anon.ts
// =============================================================================
// LUSTRE — Anonymous Supabase Client
// For unauthenticated public operations (public quote token page).
//
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY only.  All table access is blocked by
// RLS — this client can only call SECURITY DEFINER RPC functions that have
// been granted EXECUTE to the `anon` role.
//
// Safe for server-side use (Next.js Server Components / Server Actions).
// NEVER use this client for authenticated operations.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
