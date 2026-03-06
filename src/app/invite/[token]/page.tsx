// src/app/invite/[token]/page.tsx
// =============================================================================
// LUSTRE — Team Invitation Accept Page
// Public route — accessible without authentication.
// Shows invitation details and lets the recipient accept (if logged in) or
// directs them to login/signup first.
// =============================================================================

import { type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AcceptButton from './_components/AcceptButton'

interface InvitationData {
  id: string
  email: string
  role: string
  expires_at: string
  accepted_at: string | null
  org_name: string
  inviter_name: string | null
}

async function getInvitation(token: string): Promise<InvitationData | null> {
  // Use the anon client — this page is intentionally public
  const supabase = await createClient()
  const { data } = await supabase.rpc('public_get_invitation_by_token', { p_token: token })
  return data as InvitationData | null
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [invitation, supabase] = await Promise.all([
    getInvitation(token),
    createClient(),
  ])

  const { data: { user } } = await supabase.auth.getUser()

  // ── Invalid / expired / not found ──────────────────────────────────────────
  if (!invitation) {
    return (
      <PageShell>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">Invitation not found</p>
          <p className="mt-1 text-sm text-zinc-400">
            This link may have expired or already been used.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-xs font-medium uppercase tracking-widest text-[#4a5c4e] hover:underline"
          >
            Go to login
          </Link>
        </div>
      </PageShell>
    )
  }

  if (invitation.accepted_at) {
    return (
      <PageShell>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">Already accepted</p>
          <p className="mt-1 text-sm text-zinc-400">
            This invitation has already been used.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-xs font-medium uppercase tracking-widest text-[#4a5c4e] hover:underline"
          >
            Go to dashboard
          </Link>
        </div>
      </PageShell>
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <PageShell>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-900">Invitation expired</p>
          <p className="mt-1 text-sm text-zinc-400">
            Please ask your team admin to send a new invitation.
          </p>
        </div>
      </PageShell>
    )
  }

  const roleLabel = invitation.role === 'admin' ? 'Admin' : 'Team member'
  const inviterText = invitation.inviter_name
    ? `${invitation.inviter_name} has invited you`
    : 'You have been invited'

  // ── Logged in ───────────────────────────────────────────────────────────────
  if (user) {
    const emailMismatch = user.email?.toLowerCase() !== invitation.email.toLowerCase()

    return (
      <PageShell>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#4a5c4e]">
            Team invitation
          </p>
          <h1 className="mt-3 text-xl font-light text-zinc-900">
            Join {invitation.org_name}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {inviterText} to join as a <strong className="font-medium text-zinc-600">{roleLabel}</strong>.
          </p>

          {emailMismatch ? (
            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 text-left">
              <p className="text-sm font-medium text-amber-800">Wrong account</p>
              <p className="mt-1 text-xs text-amber-700">
                This invitation was sent to <strong>{invitation.email}</strong>, but you&apos;re
                signed in as <strong>{user.email}</strong>. Please sign in with the correct account.
              </p>
              <Link
                href={`/auth/signout?redirect=/invite/${token}`}
                className="mt-3 inline-block text-xs font-medium uppercase tracking-widest text-amber-800 hover:underline"
              >
                Switch account
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              <AcceptButton token={token} />
            </div>
          )}
        </div>
      </PageShell>
    )
  }

  // ── Not logged in ────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4a5c4e]">
          Team invitation
        </p>
        <h1 className="mt-3 text-xl font-light text-zinc-900">
          Join {invitation.org_name}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {inviterText} to join as a <strong className="font-medium text-zinc-600">{roleLabel}</strong>.
        </p>
        <p className="mt-1 text-xs text-zinc-400">Sent to {invitation.email}</p>

        <div className="mt-8 space-y-3">
          <Link
            href={`/invite/${token}/signup`}
            className="block w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-center text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            Create an account
          </Link>
          <Link
            href={`/login?redirect=/invite/${token}`}
            className="block w-full rounded-full border border-zinc-200 px-6 py-3 text-center text-xs font-medium uppercase tracking-widest text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
          >
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f8f5] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
