// src/app/dashboard/settings/checklists/page.tsx
// =============================================================================
// LUSTRE — Checklist Templates Settings Page (list view)
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getChecklistTemplates } from '@/lib/queries/checklists'
import ChecklistTemplateListClient from './_components/ChecklistTemplateListClient'

export default async function ChecklistsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const templates = await getChecklistTemplates()

  return (
    <main className="max-w-3xl px-4 pt-8 pb-8 sm:px-6 md:px-10 md:pt-12 md:pb-12">

        <div className="mb-8">
          <Link href="/dashboard/settings" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Settings
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mt-4">
            <div>
              <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Checklists</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Define checklists for each job type. Team members complete these during jobs.
              </p>
            </div>
            {isAdmin && (
              <Link
                href="/dashboard/settings/checklists/new"
                className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors"
              >
                + New Template
              </Link>
            )}
          </div>
        </div>

        <ChecklistTemplateListClient templates={templates} isAdmin={isAdmin} />

    </main>
  )
}
