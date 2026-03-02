// src/lib/audit.ts
// =============================================================================
// LUSTRE — Audit log helper
//
// Usage (inside a server action, after requireAdmin()):
//
//   await logAuditEvent(supabase, {
//     orgId, actorId: userId,
//     action: 'delete_client',
//     resourceType: 'client',
//     resourceId: id,
//     metadata: { name: 'Jane Smith' },
//   })
//
// Failures are swallowed — audit logging must never block the primary action.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction =
  | 'delete_client'
  | 'delete_property'
  | 'delete_job'
  | 'delete_quote'
  | 'update_vat_settings'

export async function logAuditEvent(
  supabase: SupabaseClient,
  {
    orgId,
    actorId,
    action,
    resourceType,
    resourceId,
    metadata,
  }: {
    orgId:        string
    actorId:      string
    action:       AuditAction
    resourceType: string
    resourceId?:  string
    metadata?:    Record<string, unknown>
  }
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      organisation_id: orgId,
      actor_id:        actorId,
      action,
      resource_type:   resourceType,
      resource_id:     resourceId ?? null,
      metadata:        metadata   ?? null,
    })
  } catch {
    // Audit failures must not surface to the user or block the action
  }
}
