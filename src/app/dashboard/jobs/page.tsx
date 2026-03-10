'use client'

// src/app/dashboard/jobs/page.tsx
// =============================================================================
// LUSTRE — Jobs list with tag filter chips
// =============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Tag } from '@/lib/types'

type JobRow = {
  id: string
  status: string
  scheduled_date: string | null
  clients: { first_name: string; last_name: string } | null
  properties: { address_line1: string } | null
  job_types: { name: string } | null
  tags: { id: string; name: string; colour: string | null }[]
}

const statusColour: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-600',
  in_progress: 'bg-amber-50 text-amber-600',
  completed:   'bg-emerald-50 text-emerald-600',
  cancelled:   'bg-zinc-100 text-zinc-400',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function JobsPage() {
  const [jobs, setJobs]                 = useState<JobRow[]>([])
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

      const [{ data: jobData }, { data: tagData }, { data: entityTagData }] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, status, scheduled_date, clients(first_name, last_name), properties(address_line1), job_types(name)')
          .eq('organisation_id', orgId)
          .order('scheduled_date', { ascending: false }),
        supabase
          .from('tags')
          .select('id, name, colour, organisation_id, created_at')
          .eq('organisation_id', orgId)
          .order('name', { ascending: true }),
        supabase
          .from('entity_tags')
          .select('entity_id, tags(id, name, colour)')
          .eq('entity_type', 'job'),
      ])

      const tagsByJob: Record<string, { id: string; name: string; colour: string | null }[]> = {}
      for (const row of entityTagData ?? []) {
        if (!row.tags) continue
        if (!tagsByJob[row.entity_id]) tagsByJob[row.entity_id] = []
        tagsByJob[row.entity_id].push(row.tags as unknown as { id: string; name: string; colour: string | null })
      }

      setJobs((jobData ?? []).map(j => ({ ...j, tags: tagsByJob[j.id] ?? [] })) as JobRow[])
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
    ? jobs
    : jobs.filter(j => j.tags.some(t => selectedTags.has(t.id)))

  const scheduled  = jobs.filter(j => j.status === 'scheduled')
  const inProgress = jobs.filter(j => j.status === 'in_progress')
  const completed  = jobs.filter(j => j.status === 'completed')
  const cancelled  = jobs.filter(j => j.status === 'cancelled')

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
            <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#3D7A5F] mb-2">Operations</p>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
              Jobs
              <span className="text-zinc-300 ml-3 text-xl sm:text-2xl">{filtered.length}</span>
            </h1>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors"
          >
            + Schedule Job
          </Link>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden mb-6">
          {[
            { label: 'Scheduled',   count: scheduled.length,  colour: 'text-blue-600' },
            { label: 'In Progress', count: inProgress.length, colour: 'text-amber-600' },
            { label: 'Completed',   count: completed.length,  colour: 'text-emerald-600' },
            { label: 'Cancelled',   count: cancelled.length,  colour: 'text-zinc-400' },
          ].map(s => (
            <div key={s.label} className="bg-white px-4 py-4 sm:px-8 sm:py-5">
              <span className={`text-2xl font-light tracking-tight block mb-1 ${s.colour}`}>
                {s.count}
              </span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">
                {s.label}
              </span>
            </div>
          ))}
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

        {/* Jobs table */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg px-8 py-16 text-center">
            {jobs.length === 0 ? (
              <>
                <p className="text-sm text-zinc-300 tracking-wide mb-3">No jobs yet</p>
                <Link href="/dashboard/jobs/new" className="text-xs text-[#3D7A5F] hover:underline">
                  Schedule the first →
                </Link>
              </>
            ) : (
              <p className="text-sm text-zinc-300 tracking-wide">No jobs match the selected tags</p>
            )}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            {/* Table header — tablet+ only */}
            <div className="hidden sm:grid grid-cols-[1fr_140px_120px_110px_60px] gap-4 px-6 py-3 border-b border-zinc-100 bg-zinc-50">
              {['Client', 'Service', 'Date', 'Status', ''].map(h => (
                <span key={h} className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-zinc-50">
              {filtered.map(job => (
                <a
                  key={job.id}
                  href={`/dashboard/jobs/${job.id}`}
                  className="block hover:bg-zinc-50 transition-colors"
                >
                  {/* Mobile card */}
                  <div className="sm:hidden flex items-center justify-between px-4 py-4 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">
                        {job.clients?.first_name} {job.clients?.last_name}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {job.job_types?.name ?? '—'} · {job.scheduled_date ? formatDate(job.scheduled_date) : 'No date'}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide flex-shrink-0 ${statusColour[job.status]}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1fr_140px_120px_110px_60px] gap-4 px-6 py-4 items-center">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-zinc-900 block">
                        {job.clients?.first_name} {job.clients?.last_name}
                      </span>
                      <span className="text-xs text-zinc-400 truncate block">
                        {job.properties?.address_line1 ?? '—'}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {job.job_types?.name ?? '—'}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {job.scheduled_date ? formatDate(job.scheduled_date) : '—'}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex w-fit ${statusColour[job.status]}`}>
                      {job.status.replace('_', ' ')}
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
