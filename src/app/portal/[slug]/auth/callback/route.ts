// src/app/portal/[slug]/auth/callback/route.ts
// =============================================================================
// LUSTRE — Portal Auth Callback (Magic Link)
//
// Supabase redirects here after a client clicks their magic link.
// We exchange the code for a session and then either:
//   a) Activate the account (if invite_token is present) → onboarding, or
//   b) Redirect straight to the portal dashboard (returning client login).
//
// invite_token is read from the URL query string first, with a cookie fallback
// in case Supabase drops custom query params during its own redirect.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug }  = await params
  const url       = new URL(request.url)
  const code      = url.searchParams.get('code')

  // Belt-and-braces: read invite_token from URL query string, falling back to
  // the cookie set by PortalActivateButton before it called signInWithOtp.
  const inviteToken =
    url.searchParams.get('invite_token') ??
    request.cookies.get('portal_invite_token')?.value ??
    null

  const portalBase = `/portal/${slug}`

  if (!code) {
    // If we know which invite this was for, send them back to retry in the same browser
    if (inviteToken) {
      return NextResponse.redirect(
        new URL(`${portalBase}/invite/${inviteToken}?error=activation_failed`, request.url)
      )
    }
    return NextResponse.redirect(new URL(`${portalBase}?error=no_code`, request.url))
  }

  const supabase = await createClient()

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('Portal auth callback — exchangeCodeForSession error:', exchangeError)
    // Send them back to the invite page so they can request a fresh link in the same browser
    if (inviteToken) {
      return NextResponse.redirect(
        new URL(`${portalBase}/invite/${inviteToken}?error=activation_failed`, request.url)
      )
    }
    return NextResponse.redirect(new URL(`${portalBase}?error=auth_failed`, request.url))
  }

  // If this is a first-time activation, link the auth user to the client record
  if (inviteToken) {
    const { data, error: activateError } = await supabase.rpc('portal_activate_client_account', {
      p_token: inviteToken,
    })

    if (activateError || (data as { error?: string })?.error) {
      const msg = (data as { error?: string })?.error ?? 'Activation failed.'
      console.error('portal_activate_client_account error:', activateError ?? msg)
      // Sign out so the user can retry cleanly
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL(`${portalBase}/invite/${inviteToken}?error=activation_failed`, request.url)
      )
    }

    // First-time activation complete — send to onboarding so the client can
    // set a password and get a proper welcome before landing on the dashboard.
    const response = NextResponse.redirect(new URL(`${portalBase}/onboarding`, request.url))
    // Clear the invite token cookie now that activation is done
    response.cookies.delete('portal_invite_token')
    return response
  }

  return NextResponse.redirect(new URL(`${portalBase}/dashboard`, request.url))
}
