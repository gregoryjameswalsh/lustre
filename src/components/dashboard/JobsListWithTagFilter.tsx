'use client'

// src/components/dashboard/JobsListWithTagFilter.tsx
// =============================================================================
// Client island — handles tag filter chips + renders the jobs table.
// The parent server component owns pagination (URL cursors) and status tabs;
// this component owns client-side tag filtering of the current page.
// Cross-page tag filtering is part of M04 Saved Views.
// =============================================================================

import { useState } from 'react'
import TagBadge from '@/components/dashboard/TagBadge'
import PaginationControls from '@/components/ui/PaginationControls'

const MAX_BADGE_DISPLAY = 3

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

type DueStatus = 'due_today' | 'overdue' | null

function getDueStatus(dueDate: string | null, jobStatus: string): DueStatus {
  if (!dueDate || jobStatus === 'completed' || jobStatus === 'cancelled') return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  if (due.getTime() === today.getTime()) return 'due_today'
  if (due < today) return 'overdue'
  return null
}

function DueFlag({ status }: { status: DueStatus }) {
  if (!status) return null
  return status === 'overdue'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-red-50 text-red-600 border border-red-200">Overdue</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-amber-50 text-amber-600 border border-amber-200">Due today</span>
}

export type JobRow = {
  id: string
  status: string
  scheduled_date: string | null
  due_date: string | null
  clients: { first_name: string; last_name: string } | null
  properties: { address_line1: string | null; town: string | null } | null
  job_types: { name: string } | null
  tags: { id: string; name: string; colour: string | null }[]
}

export type TagRow = {
  id: string
  name: string
  colour: string | null
}

interface Props {
  jobs:     JobRow[]
  allTags:  TagRow[]
  prevHref: string | null
  nextHref: string | null
}

export default function JobsListWithTagFilter({ jobs, allTags, prevHref, nextHref }: Props) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

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

      {/* Jobs table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg px-8 py-16 text-center">
          {jobs.length === 0 ? (
            <p className="text-sm text-zinc-300 tracking-wide">No jobs yet</p>
          ) : (
            <p className="text-sm text-zinc-300 tracking-wide">No jobs match the selected tags</p>
          )}
        </div>
      ) : (
        <>
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
                      {getDueStatus(job.due_date, job.status) && (
                        <div className="mt-1.5">
                          <DueFlag status={getDueStatus(job.due_date, job.status)} />
                        </div>
                      )}
                      {job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {job.tags.slice(0, MAX_BADGE_DISPLAY).map(t => (
                            <TagBadge key={t.id} name={t.name} colour={t.colour} />
                          ))}
                          {job.tags.length > MAX_BADGE_DISPLAY && (
                            <span className="text-[10px] text-zinc-400 self-center">
                              +{job.tags.length - MAX_BADGE_DISPLAY}
                            </span>
                          )}
                        </div>
                      )}
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        {job.tags.slice(0, MAX_BADGE_DISPLAY).map(t => (
                          <TagBadge key={t.id} name={t.name} colour={t.colour} />
                        ))}
                        {job.tags.length > MAX_BADGE_DISPLAY && (
                          <span className="text-[10px] text-zinc-400 self-center">
                            +{job.tags.length - MAX_BADGE_DISPLAY}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {job.job_types?.name ?? '—'}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {job.scheduled_date ? formatDate(job.scheduled_date) : '—'}
                    </span>
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex w-fit ${statusColour[job.status]}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                      <DueFlag status={getDueStatus(job.due_date, job.status)} />
                    </div>
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
