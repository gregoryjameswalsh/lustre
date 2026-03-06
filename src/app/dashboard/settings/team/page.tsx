// src/app/dashboard/settings/team/page.tsx
// =============================================================================
// LUSTRE — Team Management Settings
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteForm from './_components/InviteForm'
import RevokeButton from './_components/RevokeButton'

async function getTeamData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'

  // Current team members
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('organisation_id', profile.organisation_id)
    .order('full_name')

  // Pending invitations (not accepted, not expired)
  const { data: pendingInvitations } = await supabase
    .from('invitations')
    .select('id, email, role, expires_at, created_at')
    .eq('organisation_id', profile.organisation_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return {
    members:            members ?? [],
    pendingInvitations: pendingInvitations ?? [],
    isAdmin,
    currentUserId:      user.id,
  }
}

export default async function TeamPage() {
  const { members, pendingInvitations, isAdmin, currentUserId } = await getTeamData()

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Team</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage who has access to your organisation.
          </p>
        </div>

        <div className="space-y-6">

          {/* Current members */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">Members</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
            <ul className="divide-y divide-zinc-100">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {member.full_name}
                      {member.id === currentUserId && (
                        <span className="ml-2 text-xs text-zinc-400">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400">{member.email}</p>
                  </div>
                  <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500 capitalize">
                    {member.role === 'team_member' ? 'Team member' : member.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pending invitations */}
          {pendingInvitations.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-sm font-medium text-zinc-900">Pending invitations</h2>
              </div>
              <ul className="divide-y divide-zinc-100">
                {pendingInvitations.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm text-zinc-900">{inv.email}</p>
                      <p className="text-xs text-zinc-400 capitalize">
                        {inv.role === 'team_member' ? 'Team member' : inv.role} · expires{' '}
                        {new Date(inv.expires_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short'
                        })}
                      </p>
                    </div>
                    {isAdmin && <RevokeButton id={inv.id} />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invite new member — admin only */}
          {isAdmin ? (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-sm font-medium text-zinc-900">Invite a team member</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  They will receive an email with a link to join your organisation.
                </p>
              </div>
              <div className="p-5">
                <InviteForm />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
              <p className="text-xs text-zinc-400">Only admins can invite team members.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
