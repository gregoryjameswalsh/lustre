// src/app/portal/[slug]/onboarding/page.tsx
// =============================================================================
// LUSTRE — Portal Onboarding Page
// Shown once after a client activates their account via an invitation link.
// Prompts them to set a password for easy future logins.
// Requires an active portal session — unauthenticated clients are redirected.
// =============================================================================

import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import PortalOnboardingForm       from './_components/PortalOnboardingForm'

export default async function PortalOnboardingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug }    = await params
  const { context } = await getPortalClientContext(slug)

  const brand = context.org_brand_color ?? '#1A3329'

  const headerContent = context.org_logo_url
    ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={context.org_logo_url}
        alt={context.org_name}
        className="max-h-10 max-w-[160px] object-contain"
      />
    )
    : (
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: brand }}
      >
        {context.org_name}
      </p>
    )

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5] px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="mb-8 flex justify-center">
          {headerContent}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">

          {/* Welcome header */}
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: `${brand}18` }}
            >
              <svg
                className="h-5 w-5"
                style={{ color: brand }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-light text-zinc-900">
              Welcome, {context.client_first_name}!
            </h1>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Your portal is ready. Set a password so you can log in easily
              next time — or skip and use a one-time email link each visit.
            </p>
          </div>

          <PortalOnboardingForm
            slug={slug}
            clientFirstName={context.client_first_name}
            brand={brand}
          />
        </div>

        <p className="mt-6 text-center text-xs text-zinc-300">
          Powered by Lustre
        </p>
      </div>
    </div>
  )
}
