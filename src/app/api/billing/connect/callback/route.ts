// src/app/api/billing/connect/callback/route.ts
// =============================================================================
// LUSTRE — Stripe Connect: OAuth callback
// Stripe redirects here after the user authorises (or declines) the connection.
// On success: exchange code for stripe_user_id and persist to organisations.
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const url    = new URL(request.url)

  const code  = url.searchParams.get('code')
  const orgId = url.searchParams.get('state') // set in /oauth route
  const error = url.searchParams.get('error')

  // User declined or something went wrong on Stripe's side
  if (error || !code || !orgId) {
    console.warn('Stripe Connect callback error:', error)
    return NextResponse.redirect(`${appUrl}/dashboard/settings?connect_error=1`)
  }

  // Verify the session still belongs to an admin of the org in state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organisation_id !== orgId || profile.role !== 'admin') {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?connect_error=1`)
  }

  // Exchange authorisation code for the connected account ID
  try {
    const tokenRes = await fetch('https://connect.stripe.com/oauth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_secret: process.env.STRIPE_SECRET_KEY ?? '',
      }),
    })

    const tokenData = await tokenRes.json() as {
      stripe_user_id?: string
      error?: string
      error_description?: string
    }

    if (!tokenRes.ok || !tokenData.stripe_user_id) {
      console.error('Stripe token exchange failed:', tokenData)
      return NextResponse.redirect(`${appUrl}/dashboard/settings?connect_error=1`)
    }

    await supabase
      .from('organisations')
      .update({
        stripe_account_id:     tokenData.stripe_user_id,
        stripe_connect_status: 'connected',
      })
      .eq('id', orgId)

    return NextResponse.redirect(`${appUrl}/dashboard/settings?connect_success=1`)

  } catch (err) {
    console.error('Stripe Connect callback exception:', err)
    return NextResponse.redirect(`${appUrl}/dashboard/settings?connect_error=1`)
  }
}
