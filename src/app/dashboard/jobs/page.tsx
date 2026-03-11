// src/app/dashboard/jobs/page.tsx
// =============================================================================
// LUSTRE — Jobs list with tag filter chips and status tabs
// Tag filter chips narrow the current page client-side.
// Full cross-page tag filtering is part of M04 Saved Views.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getJobs, getJobStatusCounts } from '@/lib/queries/jobs'
import { getTags } from '@/lib/queries/tags'
import JobsListWithTagFilter from '@/components/dashboard/JobsListWithTagFilter'
import type { JobRow } from '@/components/dashboard/JobsListWithTagFilter'

interface JobsPageProps {
  searchParams: Promise<{ after?: string; before?: string; status?: string }>
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { after, before, status } = await searchParams

  // Run paginated list + status counts + org tags in parallel
  const [result, statusCounts, allTagsRaw] = await Promise.all([
    getJobs(status, { after, before }),
    getJobStatusCounts(),
    getTags(),
  ])

  const { data: jobs, nextCursor, prevCursor } = result

  // Fetch tags for the current page's jobs
  const jobIds = jobs.map(j => j.id)
  const entityTagData = jobIds.length > 0
    ? (await supabase
        .from('entity_tags')
        .select('entity_id, tags(id, name, colour)')
        .in('entity_id', jobIds)
        .eq('entity_type', 'job')
      ).data
    : []

  const tagsByJob: Record<string, { id: string; name: string; colour: string | null }[]> = {}
  for (const row of entityTagData ?? []) {
    if (!row.tags) continue
    const tag = row.tags as unknown as { id: string; name: string; colour: string | null }
    if (!tagsByJob[row.entity_id]) tagsByJob[row.entity_id] = []
    tagsByJob[row.entity_id].push(tag)
  }

  const jobsWithTags: JobRow[] = jobs.map(j => ({
    id:             j.id,
    status:         j.status,
    scheduled_date: j.scheduled_date,
    due_date:       j.due_date ?? null,
    clients:        j.clients as { first_name: string; last_name: string } | null,
    properties:     j.properties as { address_line1: string | null; town: string | null } | null,
    job_types:      j.job_types as { name: string } | null,
    tags:           tagsByJob[j.id] ?? [],
  }))

  const allTags = allTagsRaw.map(t => ({ id: t.id, name: t.name, colour: t.colour }))

  // Pagination hrefs preserving the active status filter
  const statusParam = status ? `&status=${status}` : ''
  const prevHref = prevCursor ? `/dashboard/jobs?before=${prevCursor}${statusParam}` : null
  const nextHref = nextCursor ? `/dashboard/jobs?after=${nextCursor}${statusParam}`  : null

  const statusFilters = [
    { key: undefined,     label: 'All',         count: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    { key: 'scheduled',   label: 'Scheduled',   count: statusCounts.scheduled   ?? 0 },
    { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress ?? 0 },
    { key: 'completed',   label: 'Completed',   count: statusCounts.completed   ?? 0 },
    { key: 'cancelled',   label: 'Cancelled',   count: statusCounts.cancelled   ?? 0 },
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6 md:mb-8">
          <div>
            <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#3D7A5F] mb-2">Operations</p>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
              Jobs
            </h1>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors"
          >
            + Schedule Job
          </Link>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden mb-6">
          {[
            { label: 'Scheduled',   count: statusCounts.scheduled   ?? 0, colour: 'text-blue-600' },
            { label: 'In Progress', count: statusCounts.in_progress ?? 0, colour: 'text-amber-600' },
            { label: 'Completed',   count: statusCounts.completed   ?? 0, colour: 'text-emerald-600' },
            { label: 'Cancelled',   count: statusCounts.cancelled   ?? 0, colour: 'text-zinc-400' },
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

        {/* Status filter tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
          {statusFilters.map(f => {
            const active = f.key === status || (!f.key && !status)
            const href = f.key ? `/dashboard/jobs?status=${f.key}` : '/dashboard/jobs'
            return (
              <Link
                key={f.label}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#1A3329] text-white'
                    : 'bg-white text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${active ? 'text-white/60' : 'text-zinc-400'}`}>
                  {f.count}
                </span>
              </Link>
            )
          })}
        </div>

        <JobsListWithTagFilter
          jobs={jobsWithTags}
          allTags={allTags}
          prevHref={prevHref}
          nextHref={nextHref}
        />

      </main>
    </div>
  )
}
