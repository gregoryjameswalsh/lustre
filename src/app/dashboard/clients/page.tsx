'use client'

// src/app/dashboard/clients/page.tsx
// =============================================================================
// LUSTRE — Clients list
// Shows all org clients with their tags. Tag filter chips narrow the list
// client-side. Full cross-page tag filtering is part of M04 Saved Views.
// =============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TagBadge from '@/components/dashboard/TagBadge'
import type { Tag } from '@/lib/types'

type ClientRow = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  status: 'active' | 'inactive' | 'lead'
  tags: { id: string; name: string; colour: string | null }[]
}

const statusColour: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-600',
  lead:     'bg-amber-50 text-amber-600',
  inactive: 'bg-zinc-100 text-zinc-400',
}

const MAX_BADGE_DISPLAY = 3

export default function ClientsPage() {
  const [clients, setClients]           = useState<ClientRow[]>([])
  const [allTags, setAllTags]           = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organisation_id')
        .eq('id', user.id)
        .single()

      const orgId = profile?.organisation_id
      if (!orgId) return

      const [{ data: clientData }, { data: tagData }, { data: entityTagData }] = await Promise.all([
        supabase
          .from('clients')
          .select('id, first_name, last_name, email, status')
          .eq('organisation_id', orgId)
          .order('last_name', { ascending: true }),
        supabase
          .from('tags')
          .select('id, name, colour, organisation_id, created_at')
          .eq('organisation_id', orgId)
          .order('name', { ascending: true }),
        supabase
          .from('entity_tags')
          .select('entity_id, tag_id, tags(id, name, colour)')
          .eq('entity_type', 'client'),
      ])

      // Build map of clientId → tags
      const tagsByClient: Record<string, { id: string; name: string; colour: string | null }[]> = {}
      for (const row of entityTagData ?? []) {
        if (!row.tags) continue
        if (!tagsByClient[row.entity_id]) tagsByClient[row.entity_id] = []
        tagsByClient[row.entity_id].push(row.tags as unknown as { id: string; name: string; colour: string | null })
      }

      setClients(
        (clientData ?? []).map(c => ({ ...c, tags: tagsByClient[c.id] ?? [] }))
      )
      setAllTags(tagData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function toggleTag(tagId: string) {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(tagId) ? next.delete(tagId) : next.add(tagId)
      return next
    })
  }

  const filtered = selectedTags.size === 0
    ? clients
    : clients.filter(c => c.tags.some(t => selectedTags.has(t.id)))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <main className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 md:pt-24">
          <div className="text-sm text-zinc-300">Loading…</div>
        </main>
      </div>
    )
  }

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
              <span className="text-zinc-300 ml-3 text-xl sm:text-2xl">{filtered.length}</span>
            </h1>
          </div>
          <Link
            href="/dashboard/clients/new"
            className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors"
          >
            + Add Client
          </Link>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs text-zinc-400 tracking-wide">Filter:</span>
            {allTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide transition-all border ${
                  selectedTags.has(tag.id)
                    ? 'border-zinc-600 ring-1 ring-zinc-400'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: tag.colour ?? '#E2E8F0', color: '#1A1A1A' }}
              >
                {tag.name}
              </button>
            ))}
            {selectedTags.size > 0 && (
              <button
                onClick={() => setSelectedTags(new Set())}
                className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg px-8 py-16 text-center">
            {clients.length === 0 ? (
              <>
                <p className="text-sm text-zinc-300 tracking-wide mb-3">No clients yet</p>
                <Link href="/dashboard/clients/new" className="text-xs text-[#3D7A5F] hover:underline">
                  Add your first client →
                </Link>
              </>
            ) : (
              <p className="text-sm text-zinc-300 tracking-wide">No clients match the selected tags</p>
            )}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {/* Table header — tablet+ only */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_160px_100px_80px] gap-4 px-6 py-3 border-b border-zinc-100 bg-zinc-50">
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Name</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Email</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Tags</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Status</span>
              <span></span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-zinc-50">
              {filtered.map(client => (
                <a
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  className="block hover:bg-zinc-50 transition-colors"
                >
                  {/* Mobile card */}
                  <div className="sm:hidden flex items-center justify-between px-4 py-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#C8F5D7] flex items-center justify-center text-xs font-medium text-[#1A3329] flex-shrink-0">
                        {client.first_name[0]}{client.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{client.email ?? '—'}</p>
                        {client.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {client.tags.slice(0, MAX_BADGE_DISPLAY).map(t => (
                              <TagBadge key={t.id} name={t.name} colour={t.colour} />
                            ))}
                            {client.tags.length > MAX_BADGE_DISPLAY && (
                              <span className="text-[10px] text-zinc-400 self-center">
                                +{client.tags.length - MAX_BADGE_DISPLAY}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide flex-shrink-0 ${statusColour[client.status]}`}>
                      {client.status}
                    </span>
                  </div>

                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_160px_100px_80px] gap-4 px-6 py-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C8F5D7] flex items-center justify-center text-xs font-medium text-[#1A3329] flex-shrink-0">
                        {client.first_name[0]}{client.last_name[0]}
                      </div>
                      <span className="text-sm font-medium text-zinc-900">
                        {client.first_name} {client.last_name}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500 truncate">{client.email ?? '—'}</span>
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {client.tags.slice(0, MAX_BADGE_DISPLAY).map(t => (
                        <TagBadge key={t.id} name={t.name} colour={t.colour} />
                      ))}
                      {client.tags.length > MAX_BADGE_DISPLAY && (
                        <span className="text-[10px] text-zinc-400 self-center">
                          +{client.tags.length - MAX_BADGE_DISPLAY}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex w-fit ${statusColour[client.status]}`}>
                      {client.status}
                    </span>
                    <span className="text-xs text-zinc-300 text-right">View →</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
