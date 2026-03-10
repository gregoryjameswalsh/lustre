import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getJobs, getJobStatusCounts } from '@/lib/queries/jobs'
import PaginationControls from '@/components/ui/PaginationControls'
import type { JobWithRelations } from '@/lib/types'

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

interface JobsPageProps {
  searchParams: Promise<{ after?: string; before?: string; status?: string }>
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { after, before, status } = await searchParams

  // Run paginated list + status counts in parallel
  const [result, statusCounts] = await Promise.all([
    getJobs(status, { after, before }),
    getJobStatusCounts(),
  ])

  const { data: jobs, nextCursor, prevCursor } = result

  // Build pagination hrefs preserving the active status filter
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

        {/* Jobs table */}
        {jobs.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg px-8 py-16 text-center">
            <p className="text-sm text-zinc-300 tracking-wide mb-3">No jobs yet</p>
            <Link href="/dashboard/jobs/new" className="text-xs text-[#3D7A5F] hover:underline">
              Schedule the first →
            </Link>
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
                {jobs.map((job: JobWithRelations) => (
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

            <PaginationControls prevHref={prevHref} nextHref={nextHref} />
          </>
        )}
      </main>
    </div>
  )
}
