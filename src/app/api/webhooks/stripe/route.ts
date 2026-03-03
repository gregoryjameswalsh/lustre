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
// This route intentionally uses the Supabase service role via a direct SDK call
// (not the app client) because webhooks are unauthenticated requests from Stripe.
// The scope is strictly limited to UPDATE on organisations, keyed by Stripe IDs
// stored in our own database.
// =============================================================================

import { NextResponse }       from 'next/server'
import Stripe                 from 'stripe'
import { stripe }             from '@/lib/stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { planFromPriceId }    from '@/lib/stripe/plans'
import type { Plan, SubscriptionStatus } from '@/lib/types'

// Webhook signature secret — set in Stripe Dashboard → Webhooks → Signing secret
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Direct Supabase admin client for webhook use only.
// This is the only permitted use of the service role in the app, and it is
// scoped entirely to writing billing state back to organisations.
function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

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
  supabase: ReturnType<typeof getAdminClient>,
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

  await supabase
    .from('organisations')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id:        priceId,
      plan,
      subscription_status:    status,
      trial_ends_at:
        subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
    })
    .eq('id', orgId)
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

  const supabase = getAdminClient()

  try {
    switch (event.type) {

      // ── New subscription after Checkout ──────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        // The subscription.created event will fire immediately after and
        // handle the full state sync — nothing extra needed here.
        // We do log the checkout completion for audit purposes.
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

        await supabase
          .from('organisations')
          .update({
            plan:                'free',
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
            stripe_price_id:        null,
          })
          .eq('id', orgId)
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

        await supabase
          .from('organisations')
          .update({ subscription_status: 'past_due' })
          .eq('id', orgId)
        break
      }

      default:
        // Unhandled event types — log and return 200 so Stripe doesn't retry
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}:`, err)
    // Return 500 so Stripe retries — but only for unexpected errors, not
    // validation errors (those should return 200 to stop retries)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
