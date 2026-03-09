import { createClient }          from '@/lib/supabase/server'
import { redirect, notFound }    from 'next/navigation'
import PropertyPhotosSection     from './_components/PropertyPhotosSection'
import type { PropertyPhoto }    from '@/lib/types'

function Row({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (!value && value !== false) return null
  return (
    <div className="py-3 flex justify-between items-start border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 flex-shrink-0 w-36">{label}</span>
      <span className="text-sm text-zinc-900 text-right">{String(value)}</span>
    </div>
  )
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string; propertyId: string }>
}) {
  const { id: clientId, propertyId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (!property) notFound()

  const [{ data: client }, { data: photos }] = await Promise.all([
    supabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', clientId)
      .single(),
    supabase
      .from('property_photos')
      .select('*')
      .eq('property_id', propertyId)
      .order('display_order', { ascending: true })
      .order('uploaded_at',   { ascending: true }),
  ])

  // Generate a signed URL for the main photo to use as a server-rendered hero
  const mainPhoto = (photos ?? []).find(p => p.is_main)
  let mainPhotoUrl: string | null = null
  if (mainPhoto) {
    const { data: urlData } = await supabase.storage
      .from('property-photos')
      .createSignedUrl(mainPhoto.storage_path, 3600)
    mainPhotoUrl = urlData?.signedUrl ?? null
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-4xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        {/* Full-bleed photo with gradient overlay. Text is always readable   */}
        {/* whether a main photo is set or not (falls back to dark zinc).      */}
        <div className={`relative rounded-xl overflow-hidden mb-6 md:mb-8 h-64 sm:h-80 md:h-96 ${mainPhotoUrl ? 'bg-zinc-900' : 'bg-gradient-to-br from-zinc-800 to-zinc-900'}`}>

          {/* Background photo */}
          {mainPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainPhotoUrl}
              alt={`${property.address_line1} — main photo`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Gradient scrim: transparent at top → dark at bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          {/* Top row: breadcrumb ← and Edit button */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4">
            <a
              href={`/dashboard/clients/${clientId}`}
              className="text-xs text-white/70 hover:text-white transition-colors tracking-wide bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
            >
              ← {client?.first_name} {client?.last_name}
            </a>
            <a
              href={`/dashboard/clients/${clientId}/properties/${propertyId}/edit`}
              className="text-xs font-medium tracking-[0.15em] uppercase bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              Edit
            </a>
          </div>

          {/* Bottom: address + property-at-a-glance badges */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white drop-shadow-sm">
              {property.address_line1}
            </h1>
            {property.town && (
              <p className="text-white/65 mt-1 text-sm">
                {property.town}{property.postcode && `, ${property.postcode}`}
              </p>
            )}
            {/* Quick-reference badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {property.property_type && (
                <span className="text-xs bg-white/15 backdrop-blur-sm border border-white/10 text-white/80 px-2.5 py-1 rounded-full capitalize">
                  {property.property_type}
                </span>
              )}
              {property.bedrooms && (
                <span className="text-xs bg-white/15 backdrop-blur-sm border border-white/10 text-white/80 px-2.5 py-1 rounded-full">
                  {property.bedrooms} bed
                </span>
              )}
              {property.bathrooms && (
                <span className="text-xs bg-white/15 backdrop-blur-sm border border-white/10 text-white/80 px-2.5 py-1 rounded-full">
                  {property.bathrooms} bath
                </span>
              )}
              {property.key_held && (
                <span className="text-xs bg-white/15 backdrop-blur-sm border border-white/10 text-white/80 px-2.5 py-1 rounded-full">
                  Key held
                </span>
              )}
              {property.pets && (
                <span className="text-xs bg-white/15 backdrop-blur-sm border border-white/10 text-white/80 px-2.5 py-1 rounded-full">
                  Pets
                </span>
              )}
            </div>
          </div>

        </div>
        {/* ── /Hero ────────────────────────────────────────────────────── */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

          {/* Property details */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Property</h2>
            </div>
            <div className="px-5 py-2">
              <Row label="Type" value={property.property_type} />
              <Row label="Bedrooms" value={property.bedrooms} />
              <Row label="Bathrooms" value={property.bathrooms} />
              <Row label="Specialist Surfaces" value={property.specialist_surfaces} />
              <Row label="Pets" value={property.pets} />
              <Row label="Key Held" value={property.key_held ? 'Yes' : 'No'} />
            </div>
          </div>

          {/* Access */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Access & Entry</h2>
            </div>
            <div className="px-5 py-2">
              <Row label="Access" value={property.access_instructions} />
              <Row label="Alarm" value={property.alarm_instructions} />
              <Row label="Parking" value={property.parking_instructions} />
            </div>
          </div>

        </div>

        {/* Photos */}
        <div className="mt-4 sm:mt-6">
          <PropertyPhotosSection
            propertyId={propertyId}
            orgId={property.organisation_id}
            initialPhotos={(photos ?? []) as PropertyPhoto[]}
          />
        </div>

        {/* Schedule job CTA */}
        <div className="mt-6">
          <a
            href={`/dashboard/jobs/new?client_id=${clientId}&property_id=${propertyId}`}
            className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors"
          >
            + Schedule Job at This Property
          </a>
        </div>

      </main>
    </div>
  )
}
