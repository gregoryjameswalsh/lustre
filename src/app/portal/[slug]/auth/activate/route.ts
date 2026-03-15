// src/app/portal/[slug]/auth/activate/route.ts
// =============================================================================
// LUSTRE — Portal Account Activation Handler
//
// Called by /auth/callback (via the ?next= param) after the Supabase session
// has already been established.  Responsible for:
//
//   a) First-time activation — if invite_token is present, calls the
//      portal_activate_client_account RPC to link the auth user to the
//      client record, then redirects to /onboarding.
//
//   b) Returning client login — no invite_token, just validate the session
//      and redirect straight to the dashboard.
//
// invite_token is read from the URL query string with a cookie fallback in
// case the query string was stripped during the Supabase redirect.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug }    = await params
  const url         = new URL(request.url)
  const portalBase  = `/portal/${slug}`

  const inviteToken =
    url.searchParams.get('invite_token') ??
    request.cookies.get('portal_invite_token')?.value ??
    null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL(portalBase, request.url))
  }

  if (inviteToken) {
    const { data, error: activateError } = await supabase.rpc(
      'portal_activate_client_account',
      { p_token: inviteToken }
    )

    if (activateError || (data as { error?: string })?.error) {
      const msg = (data as { error?: string })?.error ?? 'Activation failed.'
      console.error('portal_activate_client_account error:', activateError ?? msg)
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL(`${portalBase}/invite/${inviteToken}?error=activation_failed`, request.url)
      )
    }

    const response = NextResponse.redirect(
      new URL(`${portalBase}/onboarding`, request.url)
    )
    response.cookies.delete('portal_invite_token')
    return response
  }

  return NextResponse.redirect(new URL(`${portalBase}/dashboard`, request.url))
}
