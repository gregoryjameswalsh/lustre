'use server'

// src/lib/actions/branding.ts
// =============================================================================
// LUSTRE — Operator Branding Server Actions
//
// Logo uploads happen client-side directly to the 'operator-logos' public
// Supabase Storage bucket (same pattern as property photos).
// These actions handle saving the resulting URL / brand colour to the org row
// and deleting old logo files from storage.
// =============================================================================

import { revalidatePath } from 'next/cache'
import { requireAdmin } from './_auth'
import { logAuditEvent } from '@/lib/audit'

const BUCKET = 'operator-logos'

// Validates a CSS hex colour string — accepts #RGB and #RRGGBB.
function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

// -----------------------------------------------------------------------------
// saveLogoUrlAction
// Called after a successful client-side upload to store the public URL.
// -----------------------------------------------------------------------------

export async function saveLogoUrlAction(
  logoUrl: string,
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  const { error } = await supabase
    .from('organisations')
    .update({ logo_url: logoUrl })
    .eq('id', orgId)

  if (error) return { error: 'Failed to save logo URL.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'upload_org_logo',
    resourceType: 'organisation',
    resourceId: orgId,
    metadata: { logo_url: logoUrl },
  })

  revalidatePath('/dashboard/settings')
  return {}
}

// -----------------------------------------------------------------------------
// deleteLogoAction
// Removes the logo file from Storage and clears logo_url on the org row.
// storagePath is the path within the bucket, e.g. "{org_id}/logo-{uuid}.png"
// -----------------------------------------------------------------------------

export async function deleteLogoAction(
  storagePath: string,
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  // Remove from Storage (non-fatal — we still clear the DB field)
  await supabase.storage.from(BUCKET).remove([storagePath])

  const { error } = await supabase
    .from('organisations')
    .update({ logo_url: null })
    .eq('id', orgId)

  if (error) return { error: 'Failed to remove logo.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'delete_org_logo',
    resourceType: 'organisation',
    resourceId: orgId,
    metadata: { storage_path: storagePath },
  })

  revalidatePath('/dashboard/settings')
  return {}
}

// -----------------------------------------------------------------------------
// saveBrandColorAction
// Persists the operator's chosen brand colour (hex string).
// Pass null to reset to the Lustre default.
// -----------------------------------------------------------------------------

export async function saveBrandColorAction(
  color: string | null,
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  if (color !== null && !isValidHex(color)) {
    return { error: 'Brand colour must be a valid hex value (e.g. #4a5c4e).' }
  }

  const { error } = await supabase
    .from('organisations')
    .update({ brand_color: color })
    .eq('id', orgId)

  if (error) return { error: 'Failed to save brand colour.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'update_brand_color',
    resourceType: 'organisation',
    resourceId: orgId,
    metadata: { brand_color: color },
  })

  revalidatePath('/dashboard/settings')
  return {}
}

// -----------------------------------------------------------------------------
// saveBrandColorSecondaryAction
// Persists the operator's secondary brand colour (hex string).
// Pass null to clear.
// -----------------------------------------------------------------------------

export async function saveBrandColorSecondaryAction(
  color: string | null,
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  if (color !== null && !isValidHex(color)) {
    return { error: 'Secondary colour must be a valid hex value (e.g. #e8f0e9).' }
  }

  const { error } = await supabase
    .from('organisations')
    .update({ brand_color_secondary: color })
    .eq('id', orgId)

  if (error) return { error: 'Failed to save secondary colour.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'update_brand_color_secondary',
    resourceType: 'organisation',
    resourceId: orgId,
    metadata: { brand_color_secondary: color },
  })

  revalidatePath('/dashboard/settings')
  return {}
}

// -----------------------------------------------------------------------------
// saveTaglineAction
// Persists the operator's tagline (short motto shown in PDF header / email footer).
// Pass null or empty string to clear.
// -----------------------------------------------------------------------------

export async function saveTaglineAction(
  tagline: string | null,
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await requireAdmin()

  const value = tagline?.trim() || null

  if (value && value.length > 120) {
    return { error: 'Tagline must be 120 characters or fewer.' }
  }

  const { error } = await supabase
    .from('organisations')
    .update({ tagline: value })
    .eq('id', orgId)

  if (error) return { error: 'Failed to save tagline.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action: 'update_tagline',
    resourceType: 'organisation',
    resourceId: orgId,
    metadata: { tagline: value },
  })

  revalidatePath('/dashboard/settings')
  return {}
}
