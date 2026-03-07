'use server'

// src/lib/actions/gdpr.ts
// =============================================================================
// LUSTRE — GDPR server actions (M09)
//
//   setConsent(clientId, consentType, granted)  — upsert a consent_records row
//   exportClientData(clientId)                  — DSAR JSON export → Storage
//   eraseClientData(clientId)                   — anonymise PII, log erasure
// =============================================================================

import { revalidatePath }         from 'next/cache'
import { getOrgAndUser, requirePermission } from './_auth'
import { logAuditEvent }          from '@/lib/audit'
import type { ConsentType }       from '@/lib/types'

// ---------------------------------------------------------------------------
// setConsent
// ---------------------------------------------------------------------------

export async function setConsent(
  clientId:    string,
  consentType: ConsentType,
  granted:     boolean,
): Promise<{ error?: string }> {
  try {
    const { supabase, orgId } = await getOrgAndUser()

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('consent_records')
      .upsert(
        {
          organisation_id: orgId,
          client_id:       clientId,
          consent_type:    consentType,
          granted,
          granted_at:      granted ? now : null,
          withdrawn_at:    granted ? null : now,
          source:          'manual',
        },
        { onConflict: 'client_id,consent_type' },
      )

    if (error) return { error: 'Failed to update consent.' }

    revalidatePath(`/dashboard/clients/${clientId}`)
    return {}
  } catch {
    return { error: 'An unexpected error occurred.' }
  }
}

// ---------------------------------------------------------------------------
// exportClientData — DSAR
// ---------------------------------------------------------------------------

export async function exportClientData(
  clientId: string,
): Promise<{ error?: string; url?: string }> {
  try {
    const { supabase, orgId, userId } = await requirePermission('gdpr:export')

    const [
      { data: client },
      { data: properties },
      { data: jobs },
      { data: quotes },
      { data: activities },
      { data: followUps },
      { data: consentRecords },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).eq('organisation_id', orgId).single(),
      supabase.from('properties').select('*').eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('jobs').select('*').eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('quotes').select('*').eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('activities').select('*').eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('follow_ups').select('*').eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('consent_records').select('*').eq('client_id', clientId).eq('organisation_id', orgId),
    ])

    if (!client) return { error: 'Client not found.' }

    const exportPayload = {
      exported_at:     new Date().toISOString(),
      client,
      properties:      properties      ?? [],
      jobs:            jobs            ?? [],
      quotes:          quotes          ?? [],
      activities:      activities      ?? [],
      follow_ups:      followUps       ?? [],
      consent_records: consentRecords  ?? [],
    }

    const bytes    = new TextEncoder().encode(JSON.stringify(exportPayload, null, 2))
    const filePath = `${orgId}/${clientId}_${Date.now()}.json`

    const { error: uploadError } = await supabase.storage
      .from('gdpr-exports')
      .upload(filePath, bytes, { contentType: 'application/json', upsert: false })

    if (uploadError) return { error: 'Failed to upload export file.' }

    const { data: signed, error: signedError } = await supabase.storage
      .from('gdpr-exports')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days

    if (signedError || !signed) return { error: 'Failed to generate download link.' }

    await supabase.from('gdpr_requests').insert({
      organisation_id: orgId,
      client_id:       clientId,
      request_type:    'dsar',
      status:          'completed',
      completed_at:    new Date().toISOString(),
      export_url:      signed.signedUrl,
    })

    await logAuditEvent(supabase, {
      orgId,
      actorId:      userId,
      action:       'gdpr_export',
      resourceType: 'client',
      resourceId:   clientId,
    })

    revalidatePath(`/dashboard/clients/${clientId}`)
    revalidatePath('/dashboard/settings/gdpr')
    return { url: signed.signedUrl }
  } catch {
    return { error: 'An unexpected error occurred.' }
  }
}

// ---------------------------------------------------------------------------
// eraseClientData
// ---------------------------------------------------------------------------

export async function eraseClientData(
  clientId: string,
): Promise<{ error?: string }> {
  try {
    const { supabase, orgId, userId } = await requirePermission('gdpr:erase')

    // Snapshot PII before erasure for the audit log
    const { data: client } = await supabase
      .from('clients')
      .select('first_name, last_name, email, phone')
      .eq('id', clientId)
      .eq('organisation_id', orgId)
      .single()

    if (!client) return { error: 'Client not found.' }

    // Anonymise PII on the client row — keep financial records (jobs/quotes)
    // with an anonymised reference per ICO guidance
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        first_name:       'Redacted',
        last_name:        'Redacted',
        email:            null,
        phone:            null,
        secondary_phone:  null,
        notes:            null,
      })
      .eq('id', clientId)
      .eq('organisation_id', orgId)

    if (updateError) return { error: 'Failed to anonymise client data.' }

    // Delete records that contain PII
    await Promise.all([
      supabase.from('properties').delete().eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('activities').delete().eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('follow_ups').delete().eq('client_id', clientId).eq('organisation_id', orgId),
      supabase.from('consent_records').delete().eq('client_id', clientId).eq('organisation_id', orgId),
    ])

    const now = new Date().toISOString()

    await supabase.from('gdpr_requests').insert({
      organisation_id: orgId,
      client_id:       clientId,
      request_type:    'erasure',
      status:          'completed',
      completed_at:    now,
    })

    await logAuditEvent(supabase, {
      orgId,
      actorId:      userId,
      action:       'gdpr_erase',
      resourceType: 'client',
      resourceId:   clientId,
      metadata:     { name: `${client.first_name} ${client.last_name}`, email: client.email },
    })

    revalidatePath(`/dashboard/clients/${clientId}`)
    revalidatePath('/dashboard/clients')
    revalidatePath('/dashboard/settings/gdpr')
    return {}
  } catch {
    return { error: 'An unexpected error occurred.' }
  }
}
