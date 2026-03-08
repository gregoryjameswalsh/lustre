// src/app/dashboard/settings/billing/page.tsx
// =============================================================================
// LUSTRE — Billing settings (current plan view)
// Accessible to all authenticated users with completed onboarding.
// =============================================================================

import { createClient }     from '@/lib/supabase/server'
import { redirect }         from 'next/navigation'
import Link                 from 'next/link'
import { PLANS, formatPlanPrice } from '@/lib/stripe/plans'
import ManageButton         from '@/app/billing/_components/ManageButton'
import type { Plan, SubscriptionStatus } from '@/lib/types'

async function getOrgBilling() {
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
    .select('name, plan, subscription_status, trial_ends_at, stripe_customer_id, subscription_current_period_end, subscription_cancel_at_period_end')
    .eq('id', profile.organisation_id)
    .single()

  return org
}

function trialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function planLabel(plan: Plan): string {
  if (plan === 'free')         return 'Free trial'
  if (plan === 'starter')      return 'Starter'
  if (plan === 'professional') return 'Professional'
  if (plan === 'business')     return 'Business'
  if (plan === 'enterprise')   return 'Enterprise'
  return plan
}

function statusBadge(status: SubscriptionStatus): { label: string; colour: string } {
  switch (status) {
    case 'active':    return { label: 'Active',    colour: 'bg-emerald-50 text-emerald-700' }
    case 'trialing':  return { label: 'Trial',     colour: 'bg-sky-50 text-sky-700' }
    case 'past_due':  return { label: 'Past due',  colour: 'bg-amber-50 text-amber-700' }
    case 'cancelled': return { label: 'Cancelled', colour: 'bg-zinc-100 text-zinc-500' }
  }
}

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const [org, { billing }] = await Promise.all([getOrgBilling(), searchParams])
  if (!org) redirect('/login')

  const daysLeft = trialDaysRemaining(org.trial_ends_at)
  const badge    = statusBadge(org.subscription_status)
  const planCfg  = org.plan !== 'free' && org.plan !== 'enterprise'
    ? PLANS[org.plan as keyof typeof PLANS] ?? null
    : null

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/dashboard/settings" className="hover:text-zinc-600 transition-colors">
            Settings
          </Link>
          <span>›</span>
          <span className="text-zinc-600">Billing</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900">Billing</h1>
          <p className="mt-1 text-sm text-zinc-400">{org.name}</p>
        </div>

        {/* Success banner */}
        {billing === 'success' && (
          <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            Subscription activated — welcome aboard! Your account is now fully active.
          </div>
        )}

        <div className="space-y-4">

          {/* Current plan card */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Current plan</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Your subscription and billing information
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.colour}`}>
                {badge.label}
              </span>
            </div>

            <div className="p-5 space-y-4">

              {/* Plan name + price */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-medium text-zinc-900">{planLabel(org.plan)}</p>
                  {planCfg && (
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {formatPlanPrice(planCfg.monthlyPricePence)}/mo · up to {planCfg.seats} users
                    </p>
                  )}
                </div>
              </div>

              {/* Renewal / cancellation date */}
              {org.subscription_current_period_end && org.plan !== 'free' && (
                <p className="text-sm text-zinc-500">
                  {org.subscription_cancel_at_period_end
                    ? <>Access until <strong className="text-zinc-700">{new Date(org.subscription_current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></>
                    : <>Renews <strong className="text-zinc-700">{new Date(org.subscription_current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></>
                  }
                </p>
              )}

              {/* Cancels at period end notice */}
              {org.subscription_cancel_at_period_end && org.subscription_current_period_end && (
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Your subscription is cancelled and will end on{' '}
                  <strong>{new Date(org.subscription_current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                  {' '}You can reactivate it any time before then in the customer portal.
                </div>
              )}

              {/* Trial countdown */}
              {org.plan === 'free' && daysLeft !== null && daysLeft > 0 && (
                <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  <span className="font-medium">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                  {' '}remaining on your free trial.{' '}
                  <Link href="/billing" className="underline underline-offset-2 hover:text-sky-900">
                    Choose a plan
                  </Link>
                  {' '}to ensure uninterrupted access.
                </div>
              )}

              {/* Trial expired */}
              {org.plan === 'free' && (daysLeft === 0 || daysLeft === null) && (
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Your free trial has ended.{' '}
                  <Link href="/billing" className="underline underline-offset-2 hover:text-amber-900">
                    Choose a plan
                  </Link>
                  {' '}to restore full access.
                </div>
              )}

              {/* Past due */}
              {org.subscription_status === 'past_due' && (
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Your last payment failed. Please update your payment method below.
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-1">
                {org.plan === 'free' && (
                  <Link
                    href="/billing"
                    className="rounded-lg bg-[#1A3329] px-5 py-2 text-xs font-medium tracking-[0.12em] uppercase text-white hover:bg-[#3D7A5F] transition-colors"
                  >
                    Choose a plan
                  </Link>
                )}
                {org.stripe_customer_id && org.plan !== 'free' && (
                  <ManageButton />
                )}
                {org.plan === 'free' && (
                  <Link
                    href="/billing"
                    className="rounded-lg border border-zinc-200 px-5 py-2 text-xs font-medium tracking-[0.12em] uppercase text-zinc-600 hover:border-zinc-400 transition-colors"
                  >
                    View plans
                  </Link>
                )}
              </div>

            </div>
          </div>

          {/* Included features */}
          {planCfg && (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-sm font-medium text-zinc-900">Plan features</h2>
              </div>
              <ul className="divide-y divide-zinc-50 px-5">
                {planCfg.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 py-3 text-sm text-zinc-600">
                    <span className="text-zinc-300">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-zinc-400 px-1">
            Invoices and receipts are available in the Stripe customer portal.
            For billing questions, contact{' '}
            <a href="mailto:billing@lustre.app" className="underline underline-offset-2 hover:text-zinc-600">
              billing@lustre.app
            </a>.
          </p>

        </div>
      </main>
    </div>
  )
}
