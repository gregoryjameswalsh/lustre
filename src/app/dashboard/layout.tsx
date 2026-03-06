// src/app/dashboard/layout.tsx

import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/dashboard/Nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()  // ← await needed here
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, organisations(name)')
    .eq('id', user!.id)
    .single()

  const orgName  = (profile?.organisations as unknown as { name: string } | null)?.name ?? 'Dashboard'
  const userName = profile?.full_name ?? ''

  return (
    <>
      <Nav orgName={orgName} userName={userName} />
      <main className="pt-12 pb-safe-tab md:pt-14 md:pb-0">{children}</main>
    </>
  )
}