// src/app/dashboard/layout.tsx

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import Nav              from '@/components/dashboard/Nav'

function trialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organisations(name, plan, subscription_status, trial_ends_at)')
    .eq('id', user!.id)
    .single()

  const org      = (profile?.organisations as unknown as { name: string; plan: string; subscription_status: string; trial_ends_at: string | null } | null)
  const orgName  = org?.name ?? 'Dashboard'
  const userName = profile?.full_name ?? ''

  // Paywall: free-plan org with expired trial — redirect to /billing
  if (org?.plan === 'free') {
    const isExpired = org.subscription_status === 'cancelled'
      || (org.trial_ends_at ? new Date(org.trial_ends_at) < new Date() : false)
    if (isExpired) redirect('/billing?expired=1')
  }

  // Compute trial banner data (show when ≤3 days remain)
  const daysLeft = org?.plan === 'free' ? trialDaysRemaining(org.trial_ends_at ?? null) : null
  const showTrialBanner = daysLeft !== null && daysLeft <= 3 && daysLeft > 0

  return (
    <>
      <Nav orgName={orgName} userName={userName} />

      {showTrialBanner && (
        <div className="fixed top-12 md:top-14 inset-x-0 z-40 bg-amber-50 border-b border-amber-100 px-4 py-2 text-center text-sm text-amber-800">
          <span className="font-medium">{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
          {' '}left on your free trial.{' '}
          <Link href="/billing" className="underline underline-offset-2 font-medium hover:text-amber-900 transition-colors">
            Choose a plan
          </Link>
          {' '}to keep your data and access.
        </div>
      )}

      <main className={`pt-12 pb-safe-tab md:pt-14 md:pb-0${showTrialBanner ? ' pt-[5.5rem] md:pt-[5.5rem]' : ''}`}>
        {children}
      </main>
    </>
  )
}