// src/app/api/billing/portal/route.ts
// =============================================================================
// LUSTRE — Stripe Customer Portal session
//
// POST /api/billing/portal
//
// Creates a Stripe Customer Portal session so the authenticated org can:
//   - Change or upgrade their plan
//   - Update payment method
//   - Download invoices / receipts
//   - Cancel their subscription
//
// Returns: { url: string } — redirect to Stripe's hosted portal.
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe }       from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: org } = await supabase
    .from('organisations')
    .select('stripe_customer_id')
    .eq('id', profile.organisation_id)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe first.' },
      { status: 400 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   org.stripe_customer_id,
    return_url: `${appUrl}/dashboard/settings/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
