import { createClient } from '@supabase/supabase-js'

// Service role client — server-side only, never exposed to the browser.
// Use for operations that must bypass RLS (e.g. public quote token lookups,
// unauthenticated write-backs like markQuoteViewed / respondToQuote).
// NEVER import this in any 'use client' file.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
