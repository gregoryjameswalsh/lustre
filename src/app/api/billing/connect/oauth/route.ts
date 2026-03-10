// src/app/api/billing/connect/oauth/route.ts
// =============================================================================
// LUSTRE — Stripe Connect: redirect user to Stripe's OAuth authorisation page
// =============================================================================

import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID
  if (!clientId) {
    console.error('STRIPE_CONNECT_CLIENT_ID is not set')
    return NextResponse.json({ error: 'Stripe Connect not configured' }, { status: 500 })
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const redirectUri = `${appUrl}/api/billing/connect/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    scope:         'read_write',
    redirect_uri:  redirectUri,
    state:         profile.organisation_id, // used in callback to identify org
  })

  return NextResponse.redirect(
    `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  )
}
