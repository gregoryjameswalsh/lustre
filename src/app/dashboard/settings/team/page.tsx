// src/app/dashboard/settings/team/page.tsx
// =============================================================================
// LUSTRE — Team Management Settings
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InviteForm from './_components/InviteForm'
import RevokeButton from './_components/RevokeButton'
import RemoveMemberButton from './_components/RemoveMemberButton'
import RoleSelect from './_components/RoleSelect'
import AssignRoleSelect from './_components/AssignRoleSelect'
import { PLANS } from '@/lib/stripe/plans'
import { getRoles } from '@/lib/queries/rbac'
import type { Plan } from '@/lib/types'

const SEAT_LIMITS: Record<Plan, number> = {
  free:         3,
  starter:      PLANS.starter.seats,
  professional: PLANS.professional.seats,
  business:     PLANS.business.seats,
  enterprise:   Infinity,
}

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

  const [
    { data: members },
    { data: pendingInvitations },
    { data: org },
    roles,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, custom_role_id')
      .eq('organisation_id', profile.organisation_id)
      .order('full_name'),
    supabase
      .from('invitations')
      .select('id, email, role, expires_at, created_at')
      .eq('organisation_id', profile.organisation_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('organisations')
      .select('plan')
      .eq('id', profile.organisation_id)
      .single(),
    getRoles(profile.organisation_id),
  ])

  const plan = (org?.plan ?? 'free') as Plan
  const seatLimit = SEAT_LIMITS[plan] ?? 3

  return {
    members:            members ?? [],
    pendingInvitations: pendingInvitations ?? [],
    roles,
    isAdmin,
    currentUserId:      user.id,
    plan,
    seatLimit,
  }
}

export default async function TeamPage() {
  const { members, pendingInvitations, roles, isAdmin, currentUserId, plan, seatLimit } = await getTeamData()

  const totalOccupied = members.length + pendingInvitations.length
  const atLimit       = totalOccupied >= seatLimit
  const planLabel     = plan === 'free' ? 'Free trial' : plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-4 sm:px-6 md:pt-16 md:pb-16">

        <div className="mb-8">
          <Link
            href="/dashboard/settings"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Settings
          </Link>
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Team</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage who has access to your organisation.
          </p>
        </div>

        <div className="space-y-6">

          {/* Current members */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Members</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                  {seatLimit !== Infinity && (
                    <span> · {planLabel} plan allows {seatLimit} seats</span>
                  )}
                </p>
              </div>
              {seatLimit !== Infinity && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  atLimit
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {totalOccupied} / {seatLimit}
                </span>
              )}
            </div>
            <ul className="divide-y divide-zinc-100">
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId
                return (
                  <li key={member.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {member.full_name || '—'}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs font-normal text-zinc-400">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{member.email}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      {isAdmin && !isCurrentUser ? (
                        <>
                          {roles.length > 0 ? (
                            <AssignRoleSelect
                              profileId={member.id}
                              currentRoleId={member.custom_role_id ?? null}
                              roles={roles}
                            />
                          ) : (
                            <RoleSelect profileId={member.id} currentRole={member.role} />
                          )}
                          <RemoveMemberButton profileId={member.id} />
                        </>
                      ) : (
                        <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500">
                          {roles.find(r => r.id === member.custom_role_id)?.name
                            ?? (member.role === 'team_member' ? 'Team member' : 'Admin')}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
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
                        {inv.role === 'team_member' ? 'Team member' : 'Admin'} · expires{' '}
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
                {atLimit ? (
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800">Seat limit reached</p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Your {planLabel} plan includes {seatLimit} seats ({totalOccupied} used).{' '}
                      <Link href="/dashboard/settings/billing" className="underline">
                        Upgrade your plan
                      </Link>{' '}
                      to add more team members.
                    </p>
                  </div>
                ) : (
                  <InviteForm />
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
              <p className="text-xs text-zinc-400">Only admins can invite team members.</p>
            </div>
          )}

        </div>
    </main>
  )
}
