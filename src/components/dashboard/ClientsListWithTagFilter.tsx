'use client'

// src/components/dashboard/ClientsListWithTagFilter.tsx
// =============================================================================
// Client island — handles tag filter chips + renders the clients table.
// The parent server component owns pagination (URL cursors); this component
// owns client-side tag filtering of the current page.
// Cross-page tag filtering is part of M04 Saved Views.
// =============================================================================

import { useState } from 'react'
import Link from 'next/link'
import TagBadge from '@/components/dashboard/TagBadge'
import PaginationControls from '@/components/ui/PaginationControls'

const MAX_BADGE_DISPLAY = 3

const statusColour: Record<string, string> = {
  active:   'bg-emerald-50 text-emerald-600',
  lead:     'bg-amber-50 text-amber-600',
  inactive: 'bg-zinc-100 text-zinc-400',
}

export type ClientRow = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  status: string
  tags: { id: string; name: string; colour: string | null }[]
}

export type TagRow = {
  id: string
  name: string
  colour: string | null
}

interface Props {
  clients:  ClientRow[]
  allTags:  TagRow[]
  prevHref: string | null
  nextHref: string | null
}

export default function ClientsListWithTagFilter({ clients, allTags, prevHref, nextHref }: Props) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

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

  return (
    <>
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
        <>
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {/* Table header — tablet+ only */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_160px_100px_80px] gap-4 px-6 py-3 border-b border-zinc-100 bg-zinc-50">
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Name</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Email</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Tags</span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Status</span>
              <span></span>
            </div>

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

          <PaginationControls prevHref={prevHref} nextHref={nextHref} />
        </>
      )}
    </>
  )
}
