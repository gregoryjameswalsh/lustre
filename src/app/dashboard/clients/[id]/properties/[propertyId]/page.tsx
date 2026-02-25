import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

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

  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('id', clientId)
    .single()

  const Row = ({ label, value }: { label: string; value?: string | number | boolean | null }) => {
    if (!value && value !== false) return null
    return (
      <div className="py-3 flex justify-between items-start border-b border-zinc-50 last:border-0">
        <span className="text-xs text-zinc-400 flex-shrink-0 w-36">{label}</span>
        <span className="text-sm text-zinc-900 text-right">{String(value)}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <Nav />

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <a href={`/dashboard/clients/${clientId}`} className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
              ← {client?.first_name} {client?.last_name}
            </a>
            <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-3">
              {property.address_line1}
            </h1>
            {property.town && (
              <p className="text-zinc-400 mt-1">{property.town}{property.postcode && `, ${property.postcode}`}</p>
            )}
          </div>
          <a
            href={`/dashboard/clients/${clientId}/properties/${propertyId}/edit`}
            className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-600 px-5 py-2.5 rounded-full hover:border-zinc-400 transition-colors"
          >
            Edit
          </a>
        </div>

        <div className="grid grid-cols-2 gap-6">

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

        {/* Schedule job CTA */}
        <div className="mt-6">
          <a
            href={`/dashboard/jobs/new?client_id=${clientId}&property_id=${propertyId}`}
            className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors"
          >
            + Schedule Job at This Property
          </a>
        </div>

      </main>
    </div>
  )
}