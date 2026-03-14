// src/app/portal/[slug]/invite/[token]/page.tsx
// =============================================================================
// LUSTRE — Portal Invitation Acceptance Page
// Public route — no auth required.
// Shows invitation details and lets the client trigger the magic-link flow
// which activates their account on callback.
// =============================================================================

import type { ReactNode }  from 'react'
import { createClient }    from '@/lib/supabase/server'
import PortalActivateButton from './_components/PortalActivateButton'

interface InvitationData {
  id:               string
  email:            string
  expires_at:       string
  used_at:          string | null
  org_name:         string
  org_slug:         string | null
  org_brand_color:  string | null
  org_logo_url:     string | null
  client_first_name: string
}

async function getInvitation(token: string): Promise<InvitationData | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('public_get_portal_invite_by_token', { p_token: token })
  return data as InvitationData | null
}

export default async function PortalInvitePage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string; token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { slug, token } = await params
  const { error: queryError } = await searchParams
  const invitation = await getInvitation(token)

  const brand = invitation?.org_brand_color ?? '#1A3329'

  const headerContent = invitation?.org_logo_url
    ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={invitation.org_logo_url}
        alt={invitation.org_name}
        className="max-h-10 max-w-[160px] object-contain"
      />
    )
    : (
      <p
        className="text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: brand }}
      >
        {invitation?.org_name ?? 'Your Client Portal'}
      </p>
    )

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!invitation) {
    return (
      <PageShell header={null}>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">Invitation not found</p>
          <p className="mt-1 text-sm text-zinc-400">
            This link may have expired or already been used.
          </p>
        </div>
      </PageShell>
    )
  }

  // ── Already used ───────────────────────────────────────────────────────────
  if (invitation.used_at) {
    return (
      <PageShell header={headerContent}>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">Already activated</p>
          <p className="mt-1 text-sm text-zinc-400">
            This invitation has already been used. Go to your portal to log in.
          </p>
          <a
            href={`/portal/${slug}`}
            className="mt-6 inline-block text-xs font-medium uppercase tracking-widest hover:underline"
            style={{ color: brand }}
          >
            Go to portal
          </a>
        </div>
      </PageShell>
    )
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <PageShell header={headerContent}>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">Invitation expired</p>
          <p className="mt-1 text-sm text-zinc-400">
            Please ask {invitation.org_name} to send you a new invitation.
          </p>
        </div>
      </PageShell>
    )
  }

  // ── Valid invitation ───────────────────────────────────────────────────────
  return (
    <PageShell header={headerContent}>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand }}>
          You&apos;re invited
        </p>
        <h1 className="mt-3 text-xl font-light text-zinc-900">
          Welcome, {invitation.client_first_name}
        </h1>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          <strong className="text-zinc-600">{invitation.org_name}</strong> has set up a
          client portal for you to view your appointments and leave special instructions.
        </p>

        {queryError === 'activation_failed' && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-left">
            <p className="text-sm font-medium text-red-800">Link expired or already used</p>
            <p className="mt-1 text-xs text-red-700">
              The activation link may have expired. We&apos;ve sent a fresh one to your inbox —
              make sure to open it in <strong>the same browser</strong> you&apos;re using now.
            </p>
          </div>
        )}

        <div className="mt-8">
          <PortalActivateButton
            email={invitation.email}
            token={token}
            slug={slug}
            brand={brand}
          />
        </div>

        <p className="mt-6 text-xs text-zinc-400 leading-relaxed">
          The link will be sent to <span className="text-zinc-600">{invitation.email}</span>.
          Open it in the same browser or device you&apos;re using now.
        </p>
      </div>
    </PageShell>
  )
}

function PageShell({ children, header }: { children: ReactNode; header: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {header && <div className="mb-6 flex justify-center">{header}</div>}
        {children}
      </div>
    </div>
  )
}
