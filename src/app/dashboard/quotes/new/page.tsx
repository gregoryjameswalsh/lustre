// src/app/dashboard/quotes/new/page.tsx
// =============================================================================
// LUSTRE — Create Quote Page (server shell — fetches org VAT, passes to form)
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewQuoteForm from './_components/NewQuoteForm'

async function getPageData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const [{ data: clients }, { data: org }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('organisation_id', profile.organisation_id)
      .eq('status', 'active')
      .order('first_name'),
    supabase
      .from('organisations')
      .select('vat_registered, vat_rate')
      .eq('id', profile.organisation_id)
      .single()
  ])

  return { clients: clients ?? [], org }
}

export default async function NewQuotePage() {
  const { clients, org } = await getPageData()

  return (
    <NewQuoteForm
      clients={clients}
      vatRegistered={org?.vat_registered ?? false}
      vatRate={org?.vat_rate ?? 20}
    />
  )
}