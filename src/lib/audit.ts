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
  | 'add_custom_email_domain'
  | 'verify_custom_email_domain'
  | 'remove_custom_email_domain'
  | 'invite_team_member'
  | 'revoke_invitation'
  | 'remove_member'
  | 'suspend_member'
  | 'unsuspend_member'
  | 'update_member_role'
  | 'create_job_type'
  | 'update_job_type'
  | 'deactivate_job_type'
  | 'reactivate_job_type'
  | 'delete_job_type'
  | 'create_checklist_template'
  | 'update_checklist_template'
  | 'deactivate_checklist_template'
  | 'reactivate_checklist_template'
  | 'delete_checklist_template'
  | 'duplicate_checklist_template'
  // RBAC
  | 'create_role'
  | 'update_role'
  | 'delete_role'
  | 'assign_member_role'
  // Pipeline
  | 'move_deal'
  | 'delete_deal'
  | 'pipeline_move_client'
  | 'pipeline_win_client'
  | 'pipeline_lose_client'
  // Property photos
  | 'upload_property_photo'
  | 'delete_property_photo'
  // GDPR
  | 'gdpr_export'
  | 'gdpr_erase'
  | 'gdpr_set_consent'
  // Invoices
  | 'create_invoice'
  | 'send_invoice'
  | 'void_invoice'
  | 'record_manual_payment'
  // Branding
  | 'upload_org_logo'
  | 'delete_org_logo'
  | 'update_brand_color'
  | 'update_brand_color_secondary'
  | 'update_tagline'
  // Client Portal
  | 'portal_invite_client'
  | 'portal_resend_invitation'
  | 'portal_revoke_access'
  | 'portal_settings_updated'
  | 'portal_client_instruction_submitted'
  | 'portal_client_instruction_acknowledged'

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
