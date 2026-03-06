// src/app/invite/[token]/accept/page.tsx
// =============================================================================
// LUSTRE — Invite Auto-Accept Page
// This is the emailRedirectTo destination for invite signups. Supabase sends
// the user here after they confirm their email. We immediately run
// accept_invitation() and redirect to the dashboard — no manual click needed.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — send to the invite page which will prompt login/signup
  if (!user) redirect(`/invite/${token}`)

  const { error } = await supabase.rpc('accept_invitation', { p_token: token })

  if (error) {
    // Let the invite page surface the appropriate error state
    redirect(`/invite/${token}`)
  }

  redirect('/dashboard')
}
