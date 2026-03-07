// src/lib/workos.ts
// =============================================================================
// LUSTRE — WorkOS SDK client
//
// WorkOS is installed now for MFA enforcement (M08).
// SSO (SAML 2.0 / OIDC) is deferred until enterprise revenue warrants the
// WorkOS production plan — see docs/crm-phase-1-implementation-plan.md.
//
// Usage:
//   import { workos } from '@/lib/workos'
//   const factors = await workos.mfa.listFactors({ userId })
// =============================================================================

import { WorkOS } from '@workos-inc/node'

if (!process.env.WORKOS_API_KEY) {
  // Warn at startup — not a hard crash so dev builds without WorkOS still work.
  // In production, WORKOS_API_KEY must be set.
  console.warn('[workos] WORKOS_API_KEY is not set — MFA features will be unavailable.')
}

export const workos = new WorkOS(process.env.WORKOS_API_KEY ?? '')

/**
 * Returns the WorkOS client ID from env.
 * Required for SSO flows when they are eventually enabled.
 */
export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID ?? ''
