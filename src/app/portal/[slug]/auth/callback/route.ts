// src/app/portal/[slug]/auth/callback/route.ts
// =============================================================================
// LUSTRE — Portal Auth Callback (legacy / fallback)
//
// The primary auth flow now routes through /auth/callback (whitelisted in
// Supabase) which then redirects to /portal/[slug]/auth/activate.
//
// This route exists as a fallback for:
//   • Old magic links generated before the routing change
//   • Any scenario where the invite_token arrives here with a code
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug }    = await params
  const url         = new URL(request.url)
  const code        = url.searchParams.get('code')
  const inviteToken =
    url.searchParams.get('invite_token') ??
    request.cookies.get('portal_invite_token')?.value ??
    null
  const portalBase  = `/portal/${slug}`

  if (!code) {
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
    console.error('Portal auth legacy callback — exchangeCodeForSession error:', exchangeError)
    if (inviteToken) {
      return NextResponse.redirect(
        new URL(`${portalBase}/invite/${inviteToken}?error=activation_failed`, request.url)
      )
    }
    return NextResponse.redirect(new URL(`${portalBase}?error=auth_failed`, request.url))
  }

  // Code exchanged — hand off to the activate route
  const activateUrl = new URL(`${portalBase}/auth/activate`, request.url)
  if (inviteToken) activateUrl.searchParams.set('invite_token', inviteToken)
  return NextResponse.redirect(activateUrl)
}
