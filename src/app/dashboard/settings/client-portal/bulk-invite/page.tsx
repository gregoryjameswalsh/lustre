// src/app/dashboard/settings/client-portal/bulk-invite/page.tsx
// =============================================================================
// LUSTRE — Bulk Client Portal Invitation (Enterprise only)
// =============================================================================

import { createClient }      from '@/lib/supabase/server'
import { getOrgAndUser }     from '@/lib/actions/_auth'
import { redirect }          from 'next/navigation'
import Link                  from 'next/link'
import BulkInviteForm        from './_components/BulkInviteForm'

export default async function BulkInvitePage() {
  const { supabase, orgId, isAdmin } = await getOrgAndUser()

  if (!isAdmin) redirect('/dashboard/settings/client-portal')

  // Plan gate
  const { data: org } = await supabase
    .from('organisations')
    .select('plan')
    .eq('id', orgId)
    .single()

  const plan = (org as { plan: string } | null)?.plan ?? ''
  if (plan !== 'enterprise') {
    return (
      <div className="px-6 py-8 max-w-2xl">
        <Link
          href="/dashboard/settings/client-portal"
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-5 inline-block"
        >
          ← Portal settings
        </Link>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <p className="text-sm font-medium text-zinc-900 mb-1">Enterprise feature</p>
          <p className="text-sm text-zinc-500">
            Bulk client invitations are available on the Enterprise plan.
            Upgrade to invite multiple clients to the portal at once.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-block text-xs font-medium text-[#1A3329] hover:underline"
          >
            View upgrade options →
          </Link>
        </div>
      </div>
    )
  }

  // Fetch portal settings
  const { data: settings } = await supabase
    .from('client_portal_settings')
    .select('portal_enabled, portal_slug')
    .eq('organisation_id', orgId)
    .maybeSingle()

  if (!settings?.portal_enabled || !settings.portal_slug) {
    return (
      <div className="px-6 py-8 max-w-2xl">
        <Link href="/dashboard/settings/client-portal" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-5 inline-block">← Portal settings</Link>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-6">
          <p className="text-sm text-amber-700">
            Please enable the Client Portal and set a portal URL before inviting clients in bulk.
          </p>
        </div>
      </div>
    )
  }

  // Fetch uninvited / not-active clients with email addresses
  const { data: eligibleClients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, portal_status')
    .eq('organisation_id', orgId)
    .not('email', 'is', null)
    .neq('portal_status', 'active')
    .neq('portal_status', 'suspended')
    .order('last_name')

  const clients = (eligibleClients ?? []) as {
    id: string
    first_name: string
    last_name:  string
    email:      string | null
    portal_status: string
  }[]

  return (
    <div className="px-6 py-8 max-w-2xl">
      <Link
        href="/dashboard/settings/client-portal"
        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-5 inline-block"
      >
        ← Portal settings
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-tight text-zinc-900">Bulk portal invitations</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Select clients to invite to the portal. Each will receive an invitation email.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-zinc-400">All eligible clients have already been invited or are active.</p>
        </div>
      ) : (
        <BulkInviteForm clients={clients} />
      )}
    </div>
  )
}
