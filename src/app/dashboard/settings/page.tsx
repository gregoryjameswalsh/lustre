// src/app/dashboard/settings/page.tsx
// =============================================================================
// LUSTRE — Settings Page
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VatSettingsForm from './_components/VatSettingsForm'
import EmailSettingsForm from './_components/EmailSettingsForm'
import InlineEditName from './_components/InlineEditName'
import InlineEditEmail from './_components/InlineEditEmail'

// Chevron icon used in link-only cards
function Chevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="size-4 shrink-0 text-zinc-300"
    >
      <path
        fillRule="evenodd"
        d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

async function getPageData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Lazily sync profiles.email after a confirmed email change.
  if (user.email && profile.email !== user.email) {
    await supabase.from('profiles').update({ email: user.email }).eq('id', user.id)
  }

  const isAdmin = profile.role === 'admin'

  // Fetch org data + counts in parallel
  const [
    { data: org },
    { count: memberCount },
    { count: jobTypeCount },
    { count: checklistCount },
    { count: rolesCount },
  ] = await Promise.all([
    supabase
      .from('organisations')
      .select('name, email, phone, vat_registered, vat_rate, vat_number, plan, subscription_status, trial_ends_at, email_domain_status, email_domain_name, custom_from_email')
      .eq('id', profile.organisation_id)
      .single(),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id),
    supabase
      .from('job_types')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('checklist_templates')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('roles')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)
      .eq('is_system', false),
  ])

  return {
    org,
    isAdmin,
    userEmail:      user.email ?? '',
    userName:       profile.full_name ?? '',
    memberCount:    memberCount    ?? 0,
    jobTypeCount:   jobTypeCount   ?? 0,
    checklistCount: checklistCount ?? 0,
    rolesCount:     rolesCount     ?? 0,
  }
}

export default async function SettingsPage() {
  const {
    org,
    isAdmin,
    userEmail,
    userName,
    memberCount,
    jobTypeCount,
    checklistCount,
    rolesCount,
  } = await getPageData()

  if (!org) redirect('/login')

  const planLabel =
    org.plan === 'free'         ? 'Free trial'  :
    org.plan === 'starter'      ? 'Starter'      :
    org.plan === 'professional' ? 'Professional' :
    org.plan === 'business'     ? 'Business'     :
    org.plan === 'enterprise'   ? 'Enterprise'   : org.plan

  const billingSubtitle =
    org.subscription_status === 'past_due' ? 'Payment failed'     :
    org.subscription_status === 'active'   ? `${planLabel} · Active` :
    planLabel

  return (
    <main className="max-w-3xl px-4 pt-8 pb-8 sm:px-6 md:px-10 md:pt-12 md:pb-12">

      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">{org.name}</p>
      </div>

      <div className="space-y-6">

        {/* ── Account ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">Account</h2>
            <p className="mt-0.5 text-xs text-zinc-400">{userEmail}</p>
          </div>
          <div className="divide-y divide-zinc-100">

            {/* Name */}
            <div className="px-5 py-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Full name</p>
              {isAdmin ? (
                <InlineEditName currentName={userName} />
              ) : (
                <p className="text-sm text-zinc-900">{userName || '—'}</p>
              )}
            </div>

            {/* Email */}
            <div className="px-5 py-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Email address</p>
              <InlineEditEmail currentEmail={userEmail} />
            </div>

            {/* Sign out */}
            <div className="px-5 py-4">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-200 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
                >
                  Sign out
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* ── Team + Billing — 2-col on desktop ───────────────────────── */}
        <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-2' : ''}`}>

          <Link
            href="/dashboard/settings/team"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:bg-zinc-50"
          >
            <div>
              <h2 className="text-sm font-medium text-zinc-900">Team</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                {memberCount} {memberCount === 1 ? 'member' : 'members'} · Manage access and invitations
              </p>
            </div>
            <Chevron />
          </Link>

          {isAdmin && (
            <Link
              href="/dashboard/settings/billing"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:bg-zinc-50"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-zinc-900">Billing</h2>
                  {org.subscription_status === 'past_due' && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Action required
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">{billingSubtitle}</p>
              </div>
              <Chevron />
            </Link>
          )}

        </div>

        {/* ── VAT — admin only ─────────────────────────────────────────── */}
        {isAdmin && (
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">VAT</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                VAT breakdowns appear on quotes and invoices when enabled.
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
        )}

        {/* ── Email Sending ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">Email Sending</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Choose whether quotes are sent from our shared address or your own domain.
            </p>
          </div>
          <div className="p-5">
            <EmailSettingsForm
              domainStatus={org.email_domain_status ?? null}
              domainName={org.email_domain_name ?? null}
              customFromEmail={org.custom_from_email ?? null}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* ── Admin config cards — 2-col grid on desktop ──────────────── */}
        {isAdmin && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Link
              href="/dashboard/settings/job-types"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:bg-zinc-50"
            >
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Job Types</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {jobTypeCount} active type{jobTypeCount !== 1 ? 's' : ''} · Define the jobs your business offers
                </p>
              </div>
              <Chevron />
            </Link>

            <Link
              href="/dashboard/settings/checklists"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:bg-zinc-50"
            >
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Checklists</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {checklistCount} template{checklistCount !== 1 ? 's' : ''} · Team members complete these during jobs
                </p>
              </div>
              <Chevron />
            </Link>

            <Link
              href="/dashboard/settings/roles"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:bg-zinc-50"
            >
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Roles &amp; Permissions</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {rolesCount} custom role{rolesCount !== 1 ? 's' : ''} · Control what each team member can access
                </p>
              </div>
              <Chevron />
            </Link>

            <Link
              href="/dashboard/settings/gdpr"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-5 transition-colors hover:bg-zinc-50"
            >
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Data &amp; Privacy</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  GDPR requests — data exports, erasures, and consent records
                </p>
              </div>
              <Chevron />
            </Link>

          </div>
        )}

        {/* ── Legal & Compliance ───────────────────────────────────────── */}
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
                { href: '/legal/terms',        label: 'Terms of Service' },
                { href: '/legal/privacy',       label: 'Privacy Policy' },
                { href: '/legal/dpa',           label: 'Data Processing' },
                { href: '/legal/subprocessors', label: 'Subprocessors' },
                { href: '/legal/security',      label: 'Security' },
                { href: '/legal/cookies',       label: 'Cookie Policy' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
