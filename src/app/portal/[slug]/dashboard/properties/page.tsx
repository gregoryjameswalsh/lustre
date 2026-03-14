// src/app/portal/[slug]/dashboard/properties/page.tsx
// =============================================================================
// LUSTRE — Portal Dashboard: Properties
// Read-only view of the client's registered properties.
// =============================================================================

import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import { createClient }           from '@/lib/supabase/server'
import type { PortalProperty }    from '@/lib/types'

export default async function PortalPropertiesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug }     = await params
  const { supabase, context } = await getPortalClientContext(slug)

  const { data: propertiesRaw } = await supabase.rpc('portal_get_properties', {
    p_org_slug: slug,
  })

  const properties = (propertiesRaw ?? []) as PortalProperty[]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-light tracking-tight text-zinc-900">Your properties</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Properties registered with {context.org_name}
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No properties registered yet</p>
          <p className="text-xs text-zinc-300 mt-1">
            Contact {context.org_name} to add a property.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map(property => (
            <div
              key={property.id}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-zinc-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{property.address_line1}</p>
                  {property.address_line2 && (
                    <p className="text-xs text-zinc-500">{property.address_line2}</p>
                  )}
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {[property.town, property.county, property.postcode].filter(Boolean).join(', ')}
                  </p>

                  {/* Property details */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {property.property_type && (
                      <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded capitalize">
                        {property.property_type}
                      </span>
                    )}
                    {property.bedrooms && (
                      <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded">
                        {property.bedrooms} bed
                      </span>
                    )}
                    {property.bathrooms && (
                      <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded">
                        {property.bathrooms} bath
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-300 text-center">
        To update your property details, please contact {context.org_name} directly.
      </p>
    </div>
  )
}
