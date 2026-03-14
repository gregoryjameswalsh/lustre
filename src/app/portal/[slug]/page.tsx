// src/app/portal/[slug]/page.tsx
// =============================================================================
// LUSTRE — Portal Home
// Redirects authenticated + active portal clients to the dashboard.
// Shows the login form to everyone else.
// =============================================================================

import { redirect }                  from 'next/navigation'
import { tryGetPortalClientContext } from '@/lib/actions/_portal_auth'
import PortalLoginForm               from './_components/PortalLoginForm'

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // If the user already has a valid portal session, send them straight to dashboard
  const context = await tryGetPortalClientContext(slug)
  if (context) {
    redirect(`/portal/${slug}/dashboard`)
  }

  return (
    <PortalLoginForm
      slug={slug}
      orgName={undefined}
      orgBrandColor={undefined}
      orgLogoUrl={undefined}
      welcomeMessage={undefined}
    />
  )
}
