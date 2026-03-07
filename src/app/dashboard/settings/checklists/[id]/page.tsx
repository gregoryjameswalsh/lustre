// src/app/dashboard/settings/checklists/[id]/page.tsx
// =============================================================================
// LUSTRE — Edit Checklist Template Page
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getChecklistTemplate } from '@/lib/queries/checklists'
import { getActiveJobTypes } from '@/lib/queries/job-types'
import EditChecklistTemplateClient from './_components/EditChecklistTemplateClient'

export default async function EditChecklistTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard/settings/checklists')

  const [template, jobTypes] = await Promise.all([
    getChecklistTemplate(id),
    getActiveJobTypes(),
  ])

  if (!template) notFound()

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">
        <EditChecklistTemplateClient template={template} jobTypes={jobTypes} />
      </main>
    </div>
  )
}
