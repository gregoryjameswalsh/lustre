// src/app/dashboard/settings/page.tsx
// =============================================================================
// LUSTRE — Settings Page
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VatSettingsForm from './_components/VatSettingsForm'
import EmailForm from './_components/EmailForm'

async function getOrgAndRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role, email')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Lazily sync profiles.email after a confirmed email change.
  // auth.users.email only updates once the user clicks the confirmation link,
  // so this is the safe point to propagate it — no risk from unconfirmed typos.
  if (user.email && profile.email !== user.email) {
    await supabase.from('profiles').update({ email: user.email }).eq('id', user.id)
  }

  const { data: org } = await supabase
    .from('organisations')
    .select('name, email, phone, vat_registered, vat_rate, vat_number, plan, subscription_status, trial_ends_at')
    .eq('id', profile.organisation_id)
    .single()

  return { org, isAdmin: profile.role === 'admin', userEmail: user.email ?? '' }
}

export default async function SettingsPage() {
  const { org, isAdmin, userEmail } = await getOrgAndRole()
  if (!org) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">{org.name}</p>
        </div>

        <div className="space-y-6">

          {/* VAT */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">VAT</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                These settings apply to all quotes. If you are VAT registered, your VAT number will appear on quotes and invoices.
              </p>
            </div>
            <div className="p-5">
              <VatSettingsForm
                vatRegistered={org.vat_registered ?? false}
                vatRate={org.vat_rate ?? 20}
                vatNumber={org.vat_number ?? ''}
                isAdmin={isAdmin}
              />
            </div>
          </div>

          {/* Team */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Team</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Manage members and invitations.
                </p>
              </div>
            </div>
            <div className="p-5">
              <Link
                href="/dashboard/settings/team"
                className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-5 py-2.5 rounded-full hover:border-zinc-400 hover:text-zinc-700 transition-colors inline-block"
              >
                Manage team
              </Link>
            </div>
          </div>

          {/* Billing */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Billing</h2>
                <p className="mt-0.5 text-xs text-zinc-400 capitalize">
                  {org.plan === 'free' ? 'Free trial' : org.plan} plan
                  {org.subscription_status === 'active' ? ' · Active' : ''}
                  {org.subscription_status === 'past_due' ? ' · Payment failed' : ''}
                </p>
              </div>
              {org.subscription_status === 'past_due' && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Action required
                </span>
              )}
            </div>
            <div className="p-5">
              <Link
                href="/dashboard/settings/billing"
                className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-5 py-2.5 rounded-full hover:border-zinc-400 hover:text-zinc-700 transition-colors inline-block"
              >
                Manage billing
              </Link>
            </div>
          </div>

          {/* Account */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">Account</h2>
              <p className="mt-0.5 text-xs text-zinc-400">{userEmail}</p>
            </div>
            <div className="divide-y divide-zinc-100">
              <div className="p-5">
                <p className="mb-4 text-sm font-medium text-zinc-700">Email address</p>
                <EmailForm currentEmail={userEmail} />
              </div>
              <div className="p-5">
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-5 py-2.5 rounded-full hover:border-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">Legal &amp; Compliance</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Policies, data processing terms, and security information.
              </p>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {[
                  { href: '/legal/terms',         label: 'Terms of Service' },
                  { href: '/legal/privacy',        label: 'Privacy Policy' },
                  { href: '/legal/dpa',            label: 'Data Processing' },
                  { href: '/legal/subprocessors',  label: 'Subprocessors' },
                  { href: '/legal/security',       label: 'Security' },
                  { href: '/legal/cookies',        label: 'Cookie Policy' },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-500 px-4 py-2 rounded-full hover:border-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
