// src/app/portal/[slug]/dashboard/layout.tsx
// =============================================================================
// LUSTRE — Portal Dashboard Layout
// Authenticated wrapper with branded top-nav.
// =============================================================================

import type { ReactNode }          from 'react'
import { getPortalClientContext }  from '@/lib/actions/_portal_auth'
import PortalNav                   from './_components/PortalNav'

export default async function PortalDashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params:   Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { context } = await getPortalClientContext(slug)

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PortalNav
        slug={slug}
        orgName={context.org_name}
        orgLogoUrl={context.org_logo_url}
        orgBrandColor={context.org_brand_color}
        clientFirstName={context.client_first_name}
        allowInvoiceAccess={context.allow_invoice_access}
        calendarToken={context.calendar_token}
      />
      <main className="max-w-4xl mx-auto px-4 pt-6 pb-12 sm:px-6 md:pt-8">
        {children}
      </main>
    </div>
  )
}
