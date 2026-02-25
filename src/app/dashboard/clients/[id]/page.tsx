import { createClient } from '@/lib/supabase/server'
import { getClientWithProperties } from '@/lib/queries/clients'
import { redirect, notFound } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

const serviceLabels: Record<string, string> = {
  regular: 'Regular Clean',
  deep_clean: 'Deep Clean',
  move_in: 'Move In',
  move_out: 'Move Out',
  post_event: 'Post Event',
  other: 'Other',
}

const statusColour: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600',
  in_progress: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-zinc-100 text-zinc-400',
}

const clientStatusColour: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  lead: 'bg-amber-50 text-amber-600',
  inactive: 'bg-zinc-100 text-zinc-400',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientWithProperties(id)
  if (!client) notFound()

  const properties = client.properties ?? []
  const jobs = client.jobs ?? []

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <Nav />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <a href="/dashboard/clients" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
              ← Clients
            </a>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">
                {client.first_name[0]}{client.last_name[0]}
              </div>
              <div>
                <h1 className="text-3xl font-light tracking-tight text-zinc-900">
                  {client.first_name} {client.last_name}
                </h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex mt-1 ${clientStatusColour[client.status]}`}>
                  {client.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href={`/dashboard/clients/${id}/edit`}
              className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-600 px-5 py-2.5 rounded-full hover:border-zinc-400 transition-colors"
            >
              Edit
            </a>
            <a
              href={`/dashboard/jobs/new?client_id=${id}`}
              className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-2.5 rounded-full hover:bg-[#4a5c4e] transition-colors"
            >
              + Schedule Job
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left column — contact + notes */}
          <div className="space-y-6">

            {/* Contact details */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Contact</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <span className="text-xs text-zinc-400 block mb-0.5">Email</span>
                  <span className="text-sm text-zinc-900">{client.email ?? '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block mb-0.5">Phone</span>
                  <span className="text-sm text-zinc-900">{client.phone ?? '—'}</span>
                </div>
                {client.secondary_phone && (
                  <div>
                    <span className="text-xs text-zinc-400 block mb-0.5">Secondary Phone</span>
                    <span className="text-sm text-zinc-900">{client.secondary_phone}</span>
                  </div>
                )}
                {client.source && (
                  <div>
                    <span className="text-xs text-zinc-400 block mb-0.5">Source</span>
                    <span className="text-sm text-zinc-900 capitalize">{client.source}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-zinc-400 block mb-0.5">Client Since</span>
                  <span className="text-sm text-zinc-900">{formatDate(client.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                  <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Notes</h2>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-zinc-600 leading-relaxed">{client.notes}</p>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Summary</h2>
              </div>
              <div className="divide-y divide-zinc-50">
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Total Jobs</span>
                  <span className="text-sm font-medium text-zinc-900">{jobs.length}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Properties</span>
                  <span className="text-sm font-medium text-zinc-900">{properties.length}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Completed</span>
                  <span className="text-sm font-medium text-zinc-900">
                    {jobs.filter((j: any) => j.status === 'completed').length}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Right columns — properties + jobs */}
          <div className="col-span-2 space-y-6">

            {/* Properties */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Properties</h2>
                <a
                  href={`/dashboard/clients/${id}/properties/new`}
                  className="text-xs text-[#4a5c4e] hover:underline tracking-wide"
                >
                  + Add property
                </a>
              </div>

              {properties.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 mb-2">No properties yet</p>
                  <a href={`/dashboard/clients/${id}/properties/new`} className="text-xs text-[#4a5c4e] hover:underline">
                    Add one →
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {properties.map((property: any) => (
                    <a
                      key={property.id}
                      href={`/dashboard/clients/${id}/properties/${property.id}`}
                      className="px-6 py-4 flex items-start justify-between hover:bg-zinc-50 transition-colors block"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {property.address_line1}
                          {property.town && `, ${property.town}`}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {property.postcode && (
                            <span className="text-xs text-zinc-400">{property.postcode}</span>
                          )}
                          {property.property_type && (
                            <span className="text-xs text-zinc-400 capitalize">{property.property_type}</span>
                          )}
                          {property.bedrooms && (
                            <span className="text-xs text-zinc-400">{property.bedrooms} bed</span>
                          )}
                          {property.key_held && (
                            <span className="text-xs bg-[#f0f4f1] text-[#4a5c4e] px-2 py-0.5 rounded-full">Key held</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-300">View →</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Job history */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Job History</h2>
                <a
                  href={`/dashboard/jobs/new?client_id=${id}`}
                  className="text-xs text-[#4a5c4e] hover:underline tracking-wide"
                >
                  + Schedule job
                </a>
              </div>

              {jobs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 mb-2">No jobs yet</p>
                  <a href={`/dashboard/jobs/new?client_id=${id}`} className="text-xs text-[#4a5c4e] hover:underline">
                    Schedule the first →
                  </a>
                </div>
              ) : (
                <div>
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_140px_120px_100px] gap-4 px-6 py-2 bg-zinc-50 border-b border-zinc-100">
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Property</span>
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Service</span>
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Date</span>
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Status</span>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {jobs
                      .sort((a: any, b: any) => new Date(b.scheduled_date ?? b.created_at).getTime() - new Date(a.scheduled_date ?? a.created_at).getTime())
                      .map((job: any) => (
                        <a
                          key={job.id}
                          href={`/dashboard/jobs/${job.id}`}
                          className="grid grid-cols-[1fr_140px_120px_100px] gap-4 px-6 py-3.5 items-center hover:bg-zinc-50 transition-colors"
                        >
                          <span className="text-sm text-zinc-700">
                            {job.properties?.address_line1 ?? '—'}
                          </span>
                          <span className="text-sm text-zinc-500">
                            {serviceLabels[job.service_type] ?? '—'}
                          </span>
                          <span className="text-sm text-zinc-500">
                            {job.scheduled_date ? formatDate(job.scheduled_date) : '—'}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex w-fit ${statusColour[job.status]}`}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}