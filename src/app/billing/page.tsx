// src/app/billing/page.tsx
// =============================================================================
// LUSTRE — Billing / upgrade wall (Server Component)
//
// Reachable when:
//   a) Trial has expired (plan=free, trial_ends_at < now)
//   b) Subscription is past_due or cancelled
//   c) User navigates here directly
//
// Shows the three self-serve plans with monthly / annual toggle.
// "Start subscription" buttons redirect to Stripe Checkout via the API route.
// =============================================================================

import { createClient }     from '@/lib/supabase/server'
import { redirect }         from 'next/navigation'
import { PLANS, formatPlanPrice } from '@/lib/stripe/plans'
import CheckoutButton       from './_components/CheckoutButton'
import ManageButton         from './_components/ManageButton'

async function getOrgBillingState() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('name, plan, subscription_status, trial_ends_at, stripe_customer_id')
    .eq('id', profile.organisation_id)
    .single()

  return org
}

function statusBanner(
  plan: string,
  status: string,
  trialEndsAt: string | null
): { title: string; body: string } | null {
  if (plan !== 'free') return null

  if (status === 'past_due')  return {
    title: 'Payment failed',
    body:  'Your last payment didn\'t go through. Update your payment method to restore access.',
  }
  if (status === 'cancelled') return {
    title: 'Subscription ended',
    body:  'Your subscription has been cancelled. Choose a plan below to reactivate your account.',
  }
  if (trialEndsAt && new Date(trialEndsAt) < new Date()) return {
    title: 'Your free trial has ended',
    body:  'Choose a plan below to continue using Lustre. Your data is safe.',
  }
  return null
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { billing?: string }
}) {
  const org = await getOrgBillingState()
  if (!org) redirect('/login')

  // If already on a paid plan, redirect to billing settings
  if (org.plan !== 'free' && org.subscription_status === 'active') {
    redirect('/dashboard/settings/billing')
  }

  const banner = statusBanner(org.plan, org.subscription_status, org.trial_ends_at)
  const plans  = Object.values(PLANS)

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      {/* Header */}
      <header className="border-b border-zinc-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <p className="font-['Urbanist'] text-lg font-light tracking-widest text-[#0c0c0b]">
            Lustre
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">

        {/* Cancelled success banner */}
        {searchParams.billing === 'cancelled' && (
          <div className="mb-6 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            Checkout was cancelled — no charge was made. Choose a plan below whenever you're ready.
          </div>
        )}

        {/* Status banner */}
        {banner && (
          <div className="mb-10 rounded-xl border border-zinc-200 bg-white px-6 py-5">
            <h2 className="text-base font-medium text-[#0c0c0b]">{banner.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{banner.body}</p>
          </div>
        )}

        {/* Heading */}
        <div className="mb-10 text-center">
          <h1 className="font-['Urbanist'] text-3xl font-light tracking-tight text-[#0c0c0b] sm:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Save up to 20% with an annual plan. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={[
                'flex flex-col rounded-2xl border bg-white p-6',
                plan.highlighted
                  ? 'border-[#0c0c0b] ring-1 ring-[#0c0c0b]'
                  : 'border-zinc-200',
              ].join(' ')}
            >
              {/* Plan header */}
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                      {plan.name}
                    </p>
                    {plan.highlighted && (
                      <span className="mt-1 inline-block rounded-full bg-[#0c0c0b] px-2 py-0.5 text-[10px] font-medium tracking-wider text-[#f9f8f5] uppercase">
                        Most popular
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-500">{plan.tagline}</p>
              </div>

              {/* Pricing */}
              <div className="mb-5 space-y-2">
                {/* Monthly */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <p className="text-xs text-zinc-400 mb-0.5">Monthly</p>
                  <p className="text-2xl font-light text-[#0c0c0b]">
                    {formatPlanPrice(plan.monthlyPricePence)}
                    <span className="text-sm text-zinc-400">/mo</span>
                  </p>
                  <CheckoutButton
                    priceId={plan.monthlyPriceId}
                    label="Choose monthly"
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                  />
                </div>

                {/* Annual */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs text-zinc-400">Annual</p>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      Save {Math.round((1 - plan.annualPricePence / plan.monthlyPricePence) * 100)}%
                    </span>
                  </div>
                  <p className="text-2xl font-light text-[#0c0c0b]">
                    {formatPlanPrice(plan.annualPricePence)}
                    <span className="text-sm text-zinc-400">/mo</span>
                  </p>
                  <p className="text-xs text-zinc-400 mb-2">
                    {formatPlanPrice(plan.annualTotalPence)} billed annually
                  </p>
                  <CheckoutButton
                    priceId={plan.annualPriceId}
                    label="Choose annual"
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                  />
                </div>
              </div>

              {/* Features */}
              <ul className="mt-auto space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <span className="mt-0.5 text-zinc-300">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Enterprise callout */}
        <div className="mt-8 rounded-2xl border border-zinc-100 bg-white px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#0c0c0b]">Enterprise</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              Unlimited users · SSO / SAML · Multi-branch · Custom SLA · Dedicated CSM · From £1,500/mo
            </p>
          </div>
          <a
            href="mailto:sales@lustre.app"
            className="shrink-0 rounded-full border border-zinc-300 px-5 py-2 text-xs font-medium tracking-[0.12em] uppercase text-zinc-700 hover:border-zinc-500 transition-colors"
          >
            Contact sales
          </a>
        </div>

        {/* Existing subscriber manage link */}
        {org.stripe_customer_id && (
          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-400">
              Already subscribed?{' '}
            </p>
            <div className="mt-2 flex justify-center">
              <ManageButton />
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-zinc-300">
          Prices shown exclude VAT · Cancel anytime · Secure payment via Stripe
        </p>
      </main>
    </div>
  )
}
