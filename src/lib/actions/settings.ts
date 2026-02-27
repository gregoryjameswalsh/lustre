'use server'

// src/lib/actions/settings.ts
// =============================================================================
// LUSTRE — Settings Server Actions
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getOrgAndUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  return { supabase, orgId: profile.organisation_id, role: profile.role }
}

export type SettingsFormState = { error?: string; success?: boolean }

export async function saveVatSettings(
  prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const { supabase, orgId } = await getOrgAndUser()

  const vatRegistered = formData.get('vat_registered') === 'true'
  const vatRate       = parseFloat(formData.get('vat_rate') as string || '20')
  const vatNumber     = formData.get('vat_number') as string || null

  if (vatRegistered && vatNumber && !/^GB[0-9]{9}$/.test(vatNumber.replace(/\s/g, ''))) {
    return { error: 'VAT number should be in the format GB123456789.' }
  }

  const { error } = await supabase
    .from('organisations')
    .update({
      vat_registered: vatRegistered,
      vat_rate:       vatRegistered ? vatRate : 20.00,
      vat_number:     vatRegistered ? vatNumber?.replace(/\s/g, '') || null : null,
    })
    .eq('id', orgId)

  if (error) return { error: 'Failed to save settings.' }

  revalidatePath('/dashboard/settings')
  return { success: true }
}