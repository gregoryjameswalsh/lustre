// src/app/dashboard/layout.tsx

import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/dashboard/Nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()  // ← await needed here
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisations(name)')
    .eq('id', user!.id)
    .single()

  const orgName = (profile?.organisations as any)?.name ?? 'Dashboard'

  return (
    <>
      <Nav orgName={orgName} />
      <main className="pt-12 pb-safe-tab md:pt-14 md:pb-0">{children}</main>
    </>
  )
}