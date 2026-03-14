// src/app/dashboard/settings/client-portal/page.tsx
// =============================================================================
// LUSTRE — Client Portal Settings Page
// Operators configure their client portal here: enable/disable, slug, and
// visibility toggles (team member name, pricing, completed notes, cut-off).
// =============================================================================

import { createClient }         from '@/lib/supabase/server'
import { redirect }             from 'next/navigation'
import { getCurrentPermissions } from '@/lib/actions/_auth'
import PortalSettingsForm       from './_components/PortalSettingsForm'
import type { ClientPortalSettings } from '@/lib/types'

export default async function ClientPortalSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const permissions = await getCurrentPermissions()
  const canManage   = permissions.includes('settings:write')
  if (!canManage) redirect('/dashboard/settings')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organisation_id) redirect('/login')

  const isAdmin = profile.role === 'admin'

  const { data: org } = await supabase
    .from('organisations')
    .select('name, plan')
    .eq('id', profile.organisation_id)
    .single()

  const gatedPlans     = ['professional', 'business', 'enterprise']
  const isOnGatedPlan  = gatedPlans.includes(org?.plan ?? '')

  const { data: settings } = await supabase
    .from('client_portal_settings')
    .select('*')
    .eq('organisation_id', profile.organisation_id)
    .maybeSingle()

  // Count of active portal clients (for reference)
  const { count: activeClientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', profile.organisation_id)
    .eq('portal_status', 'active')

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-16 sm:px-6 md:pt-24">

        {/* Header */}
        <div className="mb-8">
          <a
            href="/dashboard/settings"
            className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide"
          >
            ← Settings
          </a>
          <h1 className="mt-4 text-2xl font-light tracking-tight text-zinc-900">Client Portal</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Give your clients a branded self-service portal to view appointments and leave special instructions.
          </p>
        </div>

        {/* Plan gate */}
        {!isOnGatedPlan ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm font-medium text-amber-800">Professional plan required</p>
            <p className="mt-2 text-sm text-amber-700">
              The Client Portal is available on Professional, Business, and Enterprise plans.
            </p>
            <a
              href="/dashboard/settings/billing"
              className="mt-4 inline-block text-xs font-semibold uppercase tracking-widest text-amber-800 hover:underline"
            >
              Upgrade your plan →
            </a>
          </div>
        ) : (
          <PortalSettingsForm
            settings={settings as ClientPortalSettings | null}
            isAdmin={isAdmin}
            activeClientCount={activeClientCount ?? 0}
            orgName={org?.name ?? ''}
            plan={org?.plan ?? ''}
          />
        )}
      </main>
    </div>
  )
}
