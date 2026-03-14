// src/app/portal/[slug]/dashboard/requests/new/page.tsx
// =============================================================================
// LUSTRE — Portal: New Booking Request Form
// =============================================================================

import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import { createClient }           from '@/lib/supabase/server'
import type { PortalProperty }    from '@/lib/types'
import NewRequestForm             from './_components/NewRequestForm'

export default async function NewBookingRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { supabase, context } = await getPortalClientContext(slug)

  // Fetch properties + job types in parallel via SECURITY DEFINER RPCs
  const [{ data: propertiesRaw }, { data: jobTypesRaw }] = await Promise.all([
    supabase.rpc('portal_get_properties', { p_org_slug: slug }),
    supabase.rpc('portal_get_job_types_for_org', { p_org_slug: slug }),
  ])

  const properties = (Array.isArray(propertiesRaw) ? propertiesRaw : []) as PortalProperty[]
  const jobTypes   = (Array.isArray(jobTypesRaw) ? jobTypesRaw : []) as { id: string; name: string }[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-light tracking-tight text-zinc-900">New booking request</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Submit a request and {context.org_name} will be in touch to confirm.
        </p>
      </div>

      <NewRequestForm
        slug={slug}
        properties={properties}
        jobTypes={jobTypes}
        orgName={context.org_name}
      />
    </div>
  )
}
