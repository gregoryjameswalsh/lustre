// src/app/dashboard/clients/page.tsx
// =============================================================================
// LUSTRE — Clients list
// Shows all org clients with their tags. Tag filter chips narrow the list
// client-side (current page only). Full cross-page tag filtering is M04.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { getClients } from '@/lib/queries/clients'
import { getTags } from '@/lib/queries/tags'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientsListWithTagFilter from '@/components/dashboard/ClientsListWithTagFilter'
import type { ClientRow } from '@/components/dashboard/ClientsListWithTagFilter'

interface ClientsPageProps {
  searchParams: Promise<{ after?: string; before?: string }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { after, before } = await searchParams
  const result = await getClients({ after, before })
  const { data: clients, nextCursor, prevCursor } = result

  const prevHref = prevCursor ? `/dashboard/clients?before=${prevCursor}` : null
  const nextHref = nextCursor ? `/dashboard/clients?after=${nextCursor}`  : null

  // Fetch org tags + tags for the current page's clients (one extra query, bounded by page size)
  const clientIds = clients.map(c => c.id)
  const [allTagsRaw, entityTagData] = await Promise.all([
    getTags(),
    clientIds.length > 0
      ? supabase
          .from('entity_tags')
          .select('entity_id, tags(id, name, colour)')
          .in('entity_id', clientIds)
          .eq('entity_type', 'client')
          .then(r => r.data)
      : Promise.resolve([] as null),
  ])

  const tagsByClient: Record<string, { id: string; name: string; colour: string | null }[]> = {}
  for (const row of entityTagData ?? []) {
    if (!row.tags) continue
    const tag = row.tags as unknown as { id: string; name: string; colour: string | null }
    if (!tagsByClient[row.entity_id]) tagsByClient[row.entity_id] = []
    tagsByClient[row.entity_id].push(tag)
  }

  const clientsWithTags: ClientRow[] = clients.map(c => ({
    id:         c.id,
    first_name: c.first_name,
    last_name:  c.last_name,
    email:      c.email,
    status:     c.status,
    tags:       tagsByClient[c.id] ?? [],
  }))

  const allTags = allTagsRaw.map(t => ({ id: t.id, name: t.name, colour: t.colour }))

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6 md:mb-8">
          <div>
            <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#3D7A5F] mb-2">
              CRM
            </p>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
              Clients
            </h1>
          </div>
          <Link
            href="/dashboard/clients/new"
            className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors"
          >
            + Add Client
          </Link>
        </div>

        <ClientsListWithTagFilter
          clients={clientsWithTags}
          allTags={allTags}
          prevHref={prevHref}
          nextHref={nextHref}
        />

      </main>
    </div>
  )
}
