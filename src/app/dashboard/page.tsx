import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch counts
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })

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
      properties (address_line1, town)
    `)
    .eq('status', 'scheduled')
    .order('scheduled_date', { ascending: true })
    .limit(5)

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short'
    })
  }

  const serviceLabels: Record<string, string> = {
    regular: 'Regular Clean',
    deep_clean: 'Deep Clean',
    move_in: 'Move In',
    move_out: 'Move Out',
    post_event: 'Post Event',
    other: 'Other'
  }

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      {/* Nav */}
      <Nav />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#4a5c4e] mb-2">
            Overview
          </p>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900">
            Good morning
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-white px-8 py-6">
            <span className="text-3xl font-light tracking-tight text-zinc-900 block mb-1">
              {clientCount ?? 0}
            </span>
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Active Clients
            </span>
          </div>
          <div className="bg-white px-8 py-6">
            <span className="text-3xl font-light tracking-tight text-zinc-900 block mb-1">
              {scheduledCount ?? 0}
            </span>
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Upcoming Jobs
            </span>
          </div>
          <div className="bg-white px-8 py-6">
            <span className="text-3xl font-light tracking-tight text-zinc-900 block mb-1">
              {jobCount ?? 0}
            </span>
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400">
              Total Jobs
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* Upcoming Jobs */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium tracking-tight text-zinc-900">Upcoming Jobs</h2>
              <a href="/dashboard/jobs" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
                View all →
              </a>
            </div>
            <div className="divide-y divide-zinc-50">
              {!upcomingJobs || upcomingJobs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 tracking-wide">No upcoming jobs</p>
                  <a href="/dashboard/jobs/new" className="text-xs text-[#4a5c4e] mt-2 inline-block hover:underline">
                    Schedule one →
                  </a>
                </div>
              ) : (
                upcomingJobs.map((job: any) => (
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
                        {serviceLabels[job.service_type] ?? job.service_type}
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
              <a href="/dashboard/clients" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
                View all →
              </a>
            </div>
            <div className="divide-y divide-zinc-50">
              {!recentClients || recentClients.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 tracking-wide">No clients yet</p>
                  <a href="/dashboard/clients/new" className="text-xs text-[#4a5c4e] mt-2 inline-block hover:underline">
                    Add your first →
                  </a>
                </div>
              ) : (
                recentClients.map((client: any) => (
                  <a
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600">
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

        </div>

        {/* Quick actions */}
        <div className="mt-6 flex gap-3">
          <a
            href="/dashboard/clients/new"
            className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors"
          >
            + Add Client
          </a>
          <a
            href="/dashboard/jobs/new"
            className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-600 px-5 py-3 rounded-full hover:border-zinc-400 transition-colors"
          >
            + Schedule Job
          </a>
        </div>

      </main>
    </div>
  )
}