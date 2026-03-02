// src/app/dashboard/settings/page.tsx
// =============================================================================
// LUSTRE — Settings Page
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VatSettingsForm from './_components/VatSettingsForm'

async function getOrg() {
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
    .select('name, email, phone, vat_registered, vat_rate, vat_number')
    .eq('id', profile.organisation_id)
    .single()

  return org
}

export default async function SettingsPage() {
  const org = await getOrg()
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
              />
            </div>
          </div>

          {/* Account — sign out (always visible; especially useful on mobile) */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">Account</h2>
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
      </main>
    </div>
  )
}
