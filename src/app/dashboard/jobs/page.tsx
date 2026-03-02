import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getJobs } from '@/lib/queries/jobs'

const serviceLabels: Record<string, string> = {
  regular: 'Regular Clean',
  deep_clean: 'Deep Clean',
  move_in: 'Move In',
  move_out: 'Move Out',
  post_event: 'Post Event',
  other: 'Other',
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

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const jobs = await getJobs()

  const scheduled  = jobs.filter(j => j.status === 'scheduled')
  const inProgress = jobs.filter(j => j.status === 'in_progress')
  const completed  = jobs.filter(j => j.status === 'completed')
  const cancelled  = jobs.filter(j => j.status === 'cancelled')

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6 md:mb-8">
          <div>
            <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#4a5c4e] mb-2">Operations</p>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
              Jobs
              <span className="text-zinc-300 ml-3 text-xl sm:text-2xl">{jobs.length}</span>
            </h1>
          </div>
          <a
            href="/dashboard/jobs/new"
            className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors"
          >
            + Schedule Job
          </a>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden mb-8">
          {[
            { label: 'Scheduled',   count: scheduled.length,  colour: 'text-blue-600' },
            { label: 'In Progress', count: inProgress.length, colour: 'text-amber-600' },
            { label: 'Completed',   count: completed.length,  colour: 'text-emerald-600' },
            { label: 'Cancelled',   count: cancelled.length,  colour: 'text-zinc-400' },
          ].map(s => (
            <div key={s.label} className="bg-white px-4 py-4 sm:px-8 sm:py-5">
              <span className={`text-2xl font-light tracking-tight block mb-1 ${s.colour}`}
                {s.count}
              </span>
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Jobs table */}
        {jobs.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg px-8 py-16 text-center">
            <p className="text-sm text-zinc-300 tracking-wide mb-3">No jobs yet</p>
            <a href="/dashboard/jobs/new" className="text-xs text-[#4a5c4e] hover:underline">
              Schedule the first →
            </a>
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
              {jobs.map((job: any) => (
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
                        {serviceLabels[job.service_type] ?? '—'} · {job.scheduled_date ? formatDate(job.scheduled_date) : 'No date'}
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
                      {serviceLabels[job.service_type] ?? '—'}
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