// src/app/auth/callback/route.ts
// Handles Supabase auth redirects — email confirmation links and password
// reset links both land here with a ?code= param that must be exchanged for
// a session before the user is redirected onward.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send to login with a hint
  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
