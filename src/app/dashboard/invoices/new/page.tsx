// src/app/dashboard/invoices/new/page.tsx
// =============================================================================
// LUSTRE — New Invoice Page
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import NewInvoiceForm   from './_components/NewInvoiceForm'
import { getQuote }     from '@/lib/queries/quotes'

async function getData() {
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
      .select('id, first_name, last_name, email')
      .eq('organisation_id', profile.organisation_id)
      .eq('status', 'active')
      .order('first_name'),
    supabase
      .from('organisations')
      .select('vat_registered, vat_rate')
      .eq('id', profile.organisation_id)
      .single(),
  ])

  return {
    clients: clients ?? [],
    vatRegistered: org?.vat_registered ?? false,
    vatRate:       org?.vat_rate       ?? 0,
  }
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ quote_id?: string }>
}) {
  const { clients, vatRegistered, vatRate } = await getData()
  const { quote_id: quoteId } = await searchParams

  let preClientId: string | undefined
  let preQuoteId:  string | undefined
  let preNotes:    string | undefined
  let preItems:    { description: string; quantity: number; unit_price: number }[] | undefined
  let fromQuote = false

  if (quoteId) {
    const quote = await getQuote(quoteId)
    // Only accepted quotes can be promoted to invoices
    if (!quote || quote.status !== 'accepted') {
      redirect(quote ? `/dashboard/quotes/${quoteId}` : '/dashboard/quotes')
    }
    preClientId = quote.client_id
    preQuoteId  = quoteId
    preNotes    = quote.notes ?? undefined
    preItems    = [...quote.quote_line_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price }))
    fromQuote = true
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="mx-auto max-w-3xl px-4 pt-8 pb-8 sm:px-6 md:pt-24 md:pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900">
            {fromQuote ? 'New invoice from quote' : 'New invoice'}
          </h1>
        </div>
        <NewInvoiceForm
          clients={clients}
          vatRegistered={vatRegistered}
          vatRate={vatRate}
          preClientId={preClientId}
          preQuoteId={preQuoteId}
          preItems={preItems}
          preNotes={preNotes}
        />
      </main>
    </div>
  )
}
