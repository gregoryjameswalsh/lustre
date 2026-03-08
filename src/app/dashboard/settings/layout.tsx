// src/app/dashboard/settings/layout.tsx
// =============================================================================
// LUSTRE — Settings layout
// Provides the shared background and a sticky sidebar nav on desktop (md+).
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsSidebarNav from './_components/SettingsSidebarNav'

async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await getIsAdmin()

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">

      {/* Sidebar — hidden on mobile, full-height white panel on desktop */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-zinc-200 md:bg-white">
        <div className="sticky top-0 px-5 pt-10 pb-8">
          <p className="mb-3 px-2 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            Settings
          </p>
          <SettingsSidebarNav isAdmin={isAdmin} />
        </div>
      </aside>

      {/* Page content — fills remaining viewport, content is left-anchored */}
      <div className="min-w-0 flex-1">
        {children}
      </div>

    </div>
  )
}
