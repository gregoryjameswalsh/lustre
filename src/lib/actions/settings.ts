'use server'

// src/lib/actions/settings.ts
// =============================================================================
// LUSTRE — Settings Server Actions
// =============================================================================

import { revalidatePath } from 'next/cache'
import { requireAdmin } from './_auth'
import { str } from './_validate'
import { logAuditEvent } from '@/lib/audit'

export type SettingsFormState = { error?: string; success?: boolean }

// Admin-only — only org admins can change VAT settings
export async function saveVatSettings(
  prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const { supabase, orgId, userId } = await requireAdmin()

  const vatRegistered = formData.get('vat_registered') === 'true'
  const vatRate       = parseFloat(formData.get('vat_rate') as string || '20')
  const vatNumber     = str(formData, 'vat_number', 20)

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

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'update_vat_settings',
    resourceType: 'organisation',
    metadata: { vat_registered: vatRegistered, vat_rate: vatRate, vat_number: vatNumber },
  })

  revalidatePath('/dashboard/settings')
  return { success: true }
}
