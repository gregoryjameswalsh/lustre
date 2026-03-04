// src/app/api/webhooks/stripe/route.ts
// =============================================================================
// LUSTRE — Stripe webhook handler
//
// Stripe sends signed events to POST /api/webhooks/stripe.
// We verify the signature, then update the organisation's billing state.
//
// Events handled:
//   checkout.session.completed         — first subscription created
//   customer.subscription.created      — subscription activated
//   customer.subscription.updated      — plan change, status change
//   customer.subscription.deleted      — subscription cancelled
//   invoice.payment_succeeded          — payment received → ensure status active
//   invoice.payment_failed             — payment failed → mark past_due
//
// This route uses the anon Supabase client and calls SECURITY DEFINER RPC
// functions (stripe_update_org_subscription, stripe_cancel_org_subscription,
// stripe_set_org_past_due) to write billing state back to organisations.
// SUPABASE_SERVICE_ROLE_KEY is not required.
// =============================================================================

import { NextResponse }       from 'next/server'
import Stripe                 from 'stripe'
import { stripe }             from '@/lib/stripe'
import { createAnonClient }   from '@/lib/supabase/anon'
import { planFromPriceId }    from '@/lib/stripe/plans'
import type { Plan, SubscriptionStatus } from '@/lib/types'

// Webhook signature secret — set in Stripe Dashboard → Webhooks → Signing secret
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Map Stripe subscription status → our SubscriptionStatus
function mapStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':            return 'active'
    case 'trialing':          return 'trialing'
    case 'past_due':          return 'past_due'
    case 'canceled':
    case 'unpaid':
    case 'paused':
    case 'incomplete':
    case 'incomplete_expired':
      return 'cancelled'
    default:
      return 'cancelled'
  }
}

async function updateOrgFromSubscription(
  supabase: ReturnType<typeof createAnonClient>,
  subscription: Stripe.Subscription
) {
  const orgId = subscription.metadata?.organisation_id
  if (!orgId) {
    console.error('Stripe webhook: subscription missing organisation_id metadata', subscription.id)
    return
  }

  const priceId = subscription.items.data[0]?.price.id ?? null
  const plan: Plan = (priceId ? planFromPriceId(priceId) : null) ?? 'free'
  const status = mapStatus(subscription.status)

  await supabase.rpc('stripe_update_org_subscription', {
    p_org_id:          orgId,
    p_subscription_id: subscription.id,
    p_price_id:        priceId,
    p_plan:            plan,
    p_status:          status,
    p_trial_ends_at:   subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  })
}

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — webhook rejected')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAnonClient()

  try {
    switch (event.type) {

      // ── New subscription after Checkout ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const orgId = session.metadata?.organisation_id
        if (orgId) {
          console.log(`Checkout completed for org ${orgId}, subscription ${session.subscription}`)
        }
        break
      }

      // ── Subscription created (fires after first checkout.session.completed)
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await updateOrgFromSubscription(supabase, subscription)
        break
      }

      // ── Subscription updated (plan change, trial end, renewal, etc.) ──────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await updateOrgFromSubscription(supabase, subscription)
        break
      }

      // ── Subscription cancelled (end of period or immediately) ─────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.organisation_id
        if (!orgId) break

        await supabase.rpc('stripe_cancel_org_subscription', {
          p_org_id: orgId,
        })
        break
      }

      // ── Payment succeeded — ensure status is active ───────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )
        await updateOrgFromSubscription(supabase, subscription)
        break
      }

      // ── Payment failed — mark past_due ────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )
        const orgId = subscription.metadata?.organisation_id
        if (!orgId) break

        await supabase.rpc('stripe_set_org_past_due', {
          p_org_id: orgId,
        })
        break
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}:`, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
