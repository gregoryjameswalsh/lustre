import { createClient } from '@/lib/supabase/server'
import { getClientWithProperties } from '@/lib/queries/clients'
import { getStages } from '@/lib/queries/pipeline'
import { getTags, getEntityTags } from '@/lib/queries/tags'
import { getCurrentPermissions } from '@/lib/actions/_auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline'
import { getClientActivities, getOpenFollowUps } from '@/lib/queries/activities'
import DataPrivacySection  from './_components/DataPrivacySection'
import PortalStatusCard    from './_components/PortalStatusCard'
import PipelineCard from './_components/PipelineCard'
import TagPicker from '@/components/dashboard/TagPicker'
import type { Property, JobWithRelations, ConsentRecord, ClientInPipeline, PipelineStage } from '@/lib/types'


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

  const [activitiesResult, followUpsResult, pipelineStages, { data: consentsData }, allTags, clientTags, permissions, { data: portalSettings }] = await Promise.all([
    getClientActivities(id),
    getOpenFollowUps(id),
    getStages(),
    supabase.from('consent_records').select('*').eq('client_id', id),
    getTags(),
    getEntityTags(id, 'client'),
    getCurrentPermissions(),
    supabase.from('client_portal_settings').select('portal_enabled, portal_slug').eq('organisation_id', client.organisation_id).maybeSingle(),
  ])

  const canEditTags    = permissions.includes('clients:write')
  // Fetch current user's role to determine admin status for portal actions
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = currentProfile?.role === 'admin'
  const activities     = activitiesResult.data
  const followUps      = followUpsResult.data
  const activitiesNext = activitiesResult.nextCursor

  // Fetch main photos for all properties and generate signed URLs
  const propertyIds = (client.properties ?? []).map((p: Property) => p.id)
  const mainPhotoUrls: Record<string, string> = {}
  if (propertyIds.length > 0) {
    const { data: mainPhotos } = await supabase
      .from('property_photos')
      .select('property_id, storage_path')
      .eq('is_main', true)
      .in('property_id', propertyIds)

    if (mainPhotos && mainPhotos.length > 0) {
      const paths = mainPhotos.map(p => p.storage_path)
      const { data: signedUrls } = await supabase.storage
        .from('property-photos')
        .createSignedUrls(paths, 3600)

      if (signedUrls) {
        for (const photo of mainPhotos) {
          const match = signedUrls.find(u => u.path === photo.storage_path)
          if (match?.signedUrl) mainPhotoUrls[photo.property_id] = match.signedUrl
        }
      }
    }
  }

  const properties = client.properties ?? []
  const jobs       = client.jobs ?? []
  const consents   = (consentsData ?? []) as ConsentRecord[]

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6 md:mb-8">
          <div>
            <Link href="/dashboard/clients" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
              ← Clients
            </Link>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600 flex-shrink-0">
                {client.first_name[0]}{client.last_name[0]}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
                  {client.first_name} {client.last_name}
                </h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex mt-1 ${clientStatusColour[client.status]}`}>
                  {client.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/dashboard/clients/${id}/edit`}
              className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-600 px-5 py-2.5 rounded-lg hover:border-zinc-400 transition-colors"
            >
              Edit
            </a>
            <a
              href={`/dashboard/jobs/new?client_id=${id}`}
              className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-2.5 rounded-lg hover:bg-[#3D7A5F] transition-colors"
            >
              + Schedule Job
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

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

            {/* Tags */}
            <div className="bg-white border border-zinc-200 rounded-lg">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Tags</h2>
              </div>
              <div className="px-5 py-4">
                <TagPicker
                  entityId={id}
                  entityType="client"
                  allTags={allTags}
                  appliedTags={clientTags}
                  canEdit={canEditTags}
                />
              </div>
            </div>

            {/* Pipeline (shown only for leads in the pipeline) */}
            {client.status === 'lead' && client.pipeline_stage_id && (
              <PipelineCard
                client={client as unknown as ClientInPipeline & { pipeline_stages?: { name: string; colour: string | null } | null; pipeline_assigned_profile?: { full_name: string | null } | null }}
                allStages={pipelineStages as PipelineStage[]}
              />
            )}

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
                    {jobs.filter((j: { status: string }) => j.status === 'completed').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Client Portal */}
            <PortalStatusCard
              clientId={id}
              clientEmail={client.email}
              portalStatus={(client as { portal_status?: string }).portal_status as import('@/lib/types').PortalStatus ?? 'not_invited'}
              isAdmin={isAdmin}
              portalSlug={portalSettings?.portal_slug ?? null}
              portalEnabled={portalSettings?.portal_enabled ?? false}
            />

            {/* Data & Privacy */}
            <DataPrivacySection clientId={id} consents={consents} />

          </div>

          {/* Right columns — properties + jobs */}
          <div className="lg:col-span-2 space-y-6">

            {/* Properties */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Properties</h2>
                <a
                  href={`/dashboard/clients/${id}/properties/new`}
                  className="text-xs text-[#3D7A5F] hover:underline tracking-wide"
                >
                  + Add property
                </a>
              </div>

              {properties.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 mb-2">No properties yet</p>
                  <a href={`/dashboard/clients/${id}/properties/new`} className="text-xs text-[#3D7A5F] hover:underline">
                    Add one →
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {properties.map((property: Property) => (
                    <a
                      key={property.id}
                      href={`/dashboard/clients/${id}/properties/${property.id}`}
                      className="px-6 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors block"
                    >
                      {/* Main photo thumbnail */}
                      <div className="w-12 h-12 rounded-md overflow-hidden border border-zinc-100 bg-zinc-50 flex-shrink-0 flex items-center justify-center">
                        {mainPhotoUrls[property.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mainPhotoUrls[property.id]}
                            alt={property.address_line1}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-5 h-5 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
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
                            <span className="text-xs bg-[#C8F5D7] text-[#3D7A5F] px-2 py-0.5 rounded-full">Key held</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-300 flex-shrink-0">View →</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Timeline */}
<div className="mt-6">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Activity Timeline</h2>
    <span className="text-xs text-zinc-400">{activities.length} events</span>
  </div>
  <ActivityTimeline
    clientId={id}
    initialActivities={activities}
    initialFollowUps={followUps}
    initialNextCursor={activitiesNext}
  />
</div>

            {/* Job history */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Job History</h2>
                <a
                  href={`/dashboard/jobs/new?client_id=${id}`}
                  className="text-xs text-[#3D7A5F] hover:underline tracking-wide"
                >
                  + Schedule job
                </a>
              </div>

              {jobs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-zinc-300 mb-2">No jobs yet</p>
                  <a href={`/dashboard/jobs/new?client_id=${id}`} className="text-xs text-[#3D7A5F] hover:underline">
                    Schedule the first →
                  </a>
                </div>
              ) : (
                <div>
                  {/* Header row — tablet+ only */}
                  <div className="hidden sm:grid grid-cols-[1fr_140px_100px] gap-4 px-6 py-2 bg-zinc-50 border-b border-zinc-100">
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Property</span>
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Service</span>
                    <span className="text-xs font-medium tracking-[0.15em] uppercase text-zinc-400">Status</span>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {jobs
                      .sort((a: JobWithRelations, b: JobWithRelations) => new Date(b.scheduled_date ?? b.created_at).getTime() - new Date(a.scheduled_date ?? a.created_at).getTime())
                      .map((job: JobWithRelations) => (
                        <a
                          key={job.id}
                          href={`/dashboard/jobs/${job.id}`}
                          className="block hover:bg-zinc-50 transition-colors"
                        >
                          {/* Mobile card */}
                          <div className="sm:hidden flex items-center justify-between px-4 py-3.5 gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-zinc-700 truncate">
                                {job.properties?.address_line1 ?? '—'}
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
                          <div className="hidden sm:grid grid-cols-[1fr_140px_100px] gap-4 px-6 py-3.5 items-center">
                            <span className="text-sm text-zinc-700 truncate">
                              {job.properties?.address_line1 ?? '—'}
                            </span>
                            <span className="text-sm text-zinc-500">
                              {serviceLabels[job.service_type] ?? '—'}
                            </span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium tracking-wide inline-flex w-fit ${statusColour[job.status]}`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </div>
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