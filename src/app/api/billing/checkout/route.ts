// src/app/api/billing/checkout/route.ts
// =============================================================================
// LUSTRE — Stripe Checkout session creation
//
// POST /api/billing/checkout
// Body: { priceId: string }
//
// Creates a Stripe Checkout session for the authenticated org.
// Creates a Stripe Customer for the org on first call and saves the ID.
// Returns: { url: string } — the Stripe-hosted Checkout URL.
// =============================================================================

import { NextResponse }    from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { stripe }          from '@/lib/stripe'

export async function POST(request: Request) {
  // ── 1. Authenticate ────────────────────────────────────────────────────────

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
    .select('id, name, email, stripe_customer_id, plan, subscription_status')
    .eq('id', profile.organisation_id)
    .single()
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  // ── 2. Parse request ────────────────────────────────────────────────────────

  const body = await request.json().catch(() => ({}))
  const { priceId } = body as { priceId?: string }
  if (!priceId) return NextResponse.json({ error: 'priceId is required' }, { status: 400 })

  // ── 3. Ensure Stripe Customer exists ──────────────────────────────────────

  let stripeCustomerId = org.stripe_customer_id

  try {
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name:     org.name,
        email:    org.email ?? user.email ?? undefined,
        metadata: { organisation_id: org.id },
      })
      stripeCustomerId = customer.id

      await supabase
        .from('organisations')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', org.id)
    }

    // ── 4. Create Checkout Session ──────────────────────────────────────────

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer:             stripeCustomerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe Tax handles UK VAT automatically when enabled in dashboard
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      // Collect billing address for VAT purposes
      billing_address_collection: 'required',
      success_url: `${appUrl}/dashboard/settings/billing?billing=success`,
      cancel_url:  `${appUrl}/billing?billing=cancelled`,
      metadata: {
        organisation_id: org.id,
        price_id:        priceId,
      },
      subscription_data: {
        metadata: {
          organisation_id: org.id,
        },
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
