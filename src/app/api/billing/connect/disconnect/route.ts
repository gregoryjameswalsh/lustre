// src/app/api/billing/connect/disconnect/route.ts
// =============================================================================
// LUSTRE — Stripe Connect: deauthorise and clear the connected account
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: org } = await supabase
    .from('organisations')
    .select('stripe_account_id')
    .eq('id', profile.organisation_id)
    .single()

  // Deauthorise on Stripe's side (best-effort — account may already be gone)
  if (org?.stripe_account_id) {
    try {
      const res = await fetch('https://connect.stripe.com/oauth/deauthorize', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY ?? ''}`,
        },
        body: new URLSearchParams({
          client_id:      process.env.STRIPE_CONNECT_CLIENT_ID ?? '',
          stripe_user_id: org.stripe_account_id,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        console.warn('Stripe deauthorize non-OK (ignored):', body)
      }
    } catch (err) {
      console.warn('Stripe deauthorize fetch failed (ignored):', err)
    }
  }

  // Always clear locally, even if Stripe call failed
  await supabase
    .from('organisations')
    .update({
      stripe_account_id:     null,
      stripe_connect_status: 'not_connected',
    })
    .eq('id', profile.organisation_id)

  return NextResponse.json({ ok: true })
}
