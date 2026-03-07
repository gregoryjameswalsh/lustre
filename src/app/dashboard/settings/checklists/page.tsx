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
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

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
                className="self-start sm:self-auto text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors"
              >
                + New Template
              </Link>
            )}
          </div>
        </div>

        <ChecklistTemplateListClient templates={templates} isAdmin={isAdmin} />

      </main>
    </div>
  )
}
