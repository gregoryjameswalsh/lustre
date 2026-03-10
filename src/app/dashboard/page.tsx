import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAllOpenFollowUps } from '@/lib/queries/activities'
import type { Client, JobWithRelations, FollowUp } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch counts
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: pipelineCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'lead')
    .not('pipeline_stage_id', 'is', null)

  const { count: scheduledCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')

  // Fetch recent clients
  const { data: recentClients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch upcoming jobs
  const { data: upcomingJobs } = await supabase
    .from('jobs')
    .select(`
      *,
      clients (first_name, last_name),
      properties (address_line1, town),
      job_types (name)
    `)
    .eq('status', 'scheduled')
    .order('scheduled_date', { ascending: true })
    .limit(5)

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
  }

  // Add this function alongside your other helpers like formatDate
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

  const followUpsResult = await getAllOpenFollowUps()
  const allFollowUps    = followUpsResult.data

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="mb-6 md:mb-10">
          <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#3D7A5F] mb-2">
            Overview
          </p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
            {getGreeting()}
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-white px-4 py-5 sm:px-8 sm:py-6">
            <span className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 block mb-1">
              {clientCount ?? 0}
            </span>
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Active Clients
            </span>
          </div>
          <div className="bg-white px-4 py-5 sm:px-8 sm:py-6">
            <span className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 block mb-1">
              {scheduledCount ?? 0}
            </span>
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Upcoming Jobs
            </span>
          </div>
          <div className="bg-white px-4 py-5 sm:px-8 sm:py-6">
            <Link href="/dashboard/pipeline" className="block">
              <span className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 block mb-1">
                {pipelineCount ?? 0}
              </span>
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
                In Pipeline
              </span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          {/* Upcoming Jobs */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium tracking-tight text-zinc-900">Upcoming Jobs</h2>
              <Link href="/dashboard/jobs" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-zinc-50">
              {!upcomingJobs || upcomingJobs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 tracking-wide">No upcoming jobs</p>
                  <Link href="/dashboard/jobs/new" className="text-xs text-[#3D7A5F] mt-2 inline-block hover:underline">
                    Schedule one →
                  </Link>
                </div>
              ) : (
                upcomingJobs.map((job: JobWithRelations) => (
                  <div key={job.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                    <div>
                      <p className="text-sm text-zinc-900 font-medium">
                        {job.clients?.first_name} {job.clients?.last_name}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {job.properties?.address_line1}, {job.properties?.town}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-700">
                        {job.scheduled_date ? formatDate(job.scheduled_date) : '—'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {(job as JobWithRelations).job_types?.name ?? '—'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Clients */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium tracking-tight text-zinc-900">Recent Clients</h2>
              <Link href="/dashboard/clients" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-zinc-50">
              {!recentClients || recentClients.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 tracking-wide">No clients yet</p>
                  <Link href="/dashboard/clients/new" className="text-xs text-[#3D7A5F] mt-2 inline-block hover:underline">
                    Add your first →
                  </Link>
                </div>
              ) : (
                recentClients.map((client: Client) => (
                  <a
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C8F5D7] flex items-center justify-center text-xs font-medium text-[#1A3329]">
                        {client.first_name[0]}{client.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm text-zinc-900 font-medium">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">{client.email ?? '—'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide ${
                      client.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                      client.status === 'lead' ? 'bg-amber-50 text-amber-600' :
                      'bg-zinc-100 text-zinc-400'
                    }`}>
                      {client.status}
                    </span>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Open Follow-ups */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Open Follow-ups</h2>
              <span className="text-xs text-zinc-400">{allFollowUps.length} open</span>
            </div>
            <div className="divide-y divide-zinc-50">
              {!allFollowUps || allFollowUps.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 tracking-wide">All clear</p>
                </div>
              ) : (
                allFollowUps.slice(0, 5).map((fu: FollowUp & { clients?: { first_name: string; last_name: string } }) => {
                  const due = fu.due_date ? new Date(fu.due_date) : null
                  const now = new Date()
                  now.setHours(0,0,0,0)
                  const isOverdue = due && due < now
                  const priorityColour: Record<string, string> = {
                    low: 'bg-zinc-100 text-zinc-400',
                    normal: 'bg-blue-50 text-blue-500',
                    high: 'bg-amber-50 text-amber-600',
                    urgent: 'bg-red-50 text-red-500',
                  }
                  return (
                    <a
                      key={fu.id}
                      href={`/dashboard/clients/${fu.client_id}`}
                      className="px-6 py-3.5 flex items-start justify-between gap-3 hover:bg-zinc-50 transition-colors block"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${priorityColour[fu.priority]}`}>
                          {fu.priority}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-900 font-medium truncate">{fu.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {fu.clients?.first_name} {fu.clients?.last_name}
                          </p>
                        </div>
                      </div>
                      {due && (
                        <span className={`text-xs flex-shrink-0 font-medium ${isOverdue ? 'text-red-500' : 'text-zinc-400'}`}>
                          {isOverdue
                            ? `${Math.floor((now.getTime() - due.getTime()) / 86400000)}d overdue`
                            : due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          }
                        </span>
                      )}
                    </a>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* Quick actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/clients/new"
            className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors"
          >
            + Add Client
          </Link>
          <Link
            href="/dashboard/jobs/new"
            className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-600 px-5 py-3 rounded-lg hover:border-zinc-400 transition-colors"
          >
            + Schedule Job
          </Link>
        </div>

      </main>
    </div>
  )
}