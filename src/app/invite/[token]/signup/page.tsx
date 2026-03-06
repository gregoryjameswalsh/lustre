// src/app/invite/[token]/signup/page.tsx
// =============================================================================
// LUSTRE — Invite Signup Page
// Dedicated account creation for invited team members.
// Email is resolved server-side from the invite token — the user never types it.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteSignupForm from './_components/InviteSignupForm'

interface InvitationData {
  email: string
  role: string
  expires_at: string
  accepted_at: string | null
  org_name: string
  inviter_name: string | null
}

export default async function InviteSignupPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: invitation } = await supabase.rpc('public_get_invitation_by_token', {
    p_token: token,
  })

  const inv = invitation as InvitationData | null

  // Redirect back to the invite page for all error states — it handles messaging
  if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
    redirect(`/invite/${token}`)
  }

  // If already logged in, no need to sign up — send straight to accept page
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(`/invite/${token}`)

  const roleLabel = inv.role === 'admin' ? 'Admin' : 'Team member'

  return (
    <div className="flex min-h-screen bg-[#f9f8f5]">
      {/* ── Left panel — form ─────────────────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10">
            <span className="font-['Urbanist'] text-xl font-light tracking-widest text-[#0c0c0b]">
              LUSTRE
            </span>
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#4a5c4e]">
            Team invitation
          </p>
          <h1 className="mb-2 font-['Urbanist'] text-3xl font-light text-[#0c0c0b]">
            Join {inv.org_name}
          </h1>
          <p className="mb-8 text-sm font-light text-zinc-500">
            {inv.inviter_name
              ? `${inv.inviter_name} has invited you as a ${roleLabel}. Create a password to get started.`
              : `You've been invited to join as a ${roleLabel}. Create a password to get started.`}
          </p>

          <InviteSignupForm token={token} email={inv.email} />
        </div>
      </div>

      {/* ── Right panel — contextual, not marketing ───────────────────────── */}
      <div className="hidden bg-[#4a5c4e] lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:p-16">
        <div className="max-w-xs">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
            You&apos;re joining
          </p>
          <p className="mb-8 font-['Urbanist'] text-3xl font-light text-white">
            {inv.org_name}
          </p>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/20">
                <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M3.72 9.53L1.22 7.03a.75.75 0 011.06-1.06l2 2L9.72 3.03a.75.75 0 111.06 1.06L4.78 9.53a.75.75 0 01-1.06 0z" />
                </svg>
              </span>
              <p className="text-sm font-light text-white/70">
                Access shared clients, jobs, and activity across the team
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/20">
                <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M3.72 9.53L1.22 7.03a.75.75 0 011.06-1.06l2 2L9.72 3.03a.75.75 0 111.06 1.06L4.78 9.53a.75.75 0 01-1.06 0z" />
                </svg>
              </span>
              <p className="text-sm font-light text-white/70">
                Your role is <strong className="font-medium text-white/90">{roleLabel}</strong>
                {inv.inviter_name ? ` — set by ${inv.inviter_name}` : ''}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-white/20">
                <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M3.72 9.53L1.22 7.03a.75.75 0 011.06-1.06l2 2L9.72 3.03a.75.75 0 111.06 1.06L4.78 9.53a.75.75 0 01-1.06 0z" />
                </svg>
              </span>
              <p className="text-sm font-light text-white/70">
                No billing or subscription needed — managed by your account owner
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
