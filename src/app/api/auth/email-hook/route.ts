// src/app/api/auth/email-hook/route.ts
// =============================================================================
// LUSTRE — Supabase Send Email Auth Hook
//
// Supabase calls this endpoint instead of sending its own emails when the
// "Send Email" hook is enabled in the Supabase dashboard.
//
// Authentication: Supabase sends the hook secret as:
//   Authorization: Bearer <PORTAL_EMAIL_HOOK_SECRET>
//
// Handles:
//   magiclink — looks up org branding by portal slug, sends branded magic link
//               via Resend.  Falls back to generic Lustre branding if no slug.
//   recovery  — operator password reset, sends Lustre-branded reset email.
//   others    — sends a generic Lustre-branded auth email.
//
// Returns HTTP 200 on success.  On error, Supabase retries or falls back to
// its own template depending on configuration.
//
// Supabase dashboard setup:
//   Authentication → Hooks → Send Email
//   URL: https://app.simplylustre.com/api/auth/email-hook
//   Secret: <copy and set as PORTAL_EMAIL_HOOK_SECRET env var>
// =============================================================================

import { NextRequest, NextResponse }        from 'next/server'
import { createAnonClient }                 from '@/lib/supabase/anon'
import { sendPortalMagicLinkEmail }         from '@/lib/email'
import { sendAuthEmail }                    from '@/lib/email'

// ---------------------------------------------------------------------------
// Type from Supabase Send Email hook payload
// ---------------------------------------------------------------------------

interface HookEmailData {
  email:             string
  token:             string
  token_hash:        string
  redirect_to:       string
  email_action_type: string
  site_url:          string
  otp:               string
  new_email?:        string
  old_email?:        string
}

interface HookPayload {
  user?:       { id: string; email: string }
  email_data?: HookEmailData
}

// ---------------------------------------------------------------------------
// Helper: construct the magic link URL from token_hash
// ---------------------------------------------------------------------------

function buildConfirmationUrl(
  tokenHash:   string,
  actionType:  string,
  redirectTo:  string,
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const params = new URLSearchParams({
    token:       tokenHash,
    type:        actionType,
    redirect_to: redirectTo,
  })
  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Helper: extract portal slug from the redirect_to URL
//
//   redirect_to looks like:
//   https://app.../auth/callback?next=%2Fportal%2F{slug}%2Fauth%2Factivate...
// ---------------------------------------------------------------------------

function parsePortalSlug(redirectTo: string): string | null {
  try {
    const url  = new URL(redirectTo)
    const next = url.searchParams.get('next') ?? ''
    const match = next.match(/^\/portal\/([^/]+)\//)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/email-hook
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Verify hook secret
  const hookSecret = process.env.PORTAL_EMAIL_HOOK_SECRET
  const authHeader = req.headers.get('authorization')

  if (!hookSecret || authHeader !== `Bearer ${hookSecret}`) {
    console.error('[email-hook] Unauthorized — check PORTAL_EMAIL_HOOK_SECRET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse payload
  let payload: HookPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user, email_data } = payload
  if (!email_data) {
    return NextResponse.json({ error: 'Missing email_data' }, { status: 400 })
  }

  const {
    email,
    token_hash,
    redirect_to,
    email_action_type,
  } = email_data

  const to = email || user?.email || ''
  if (!to) {
    return NextResponse.json({ error: 'No recipient email' }, { status: 400 })
  }

  const confirmationUrl = buildConfirmationUrl(token_hash, email_action_type, redirect_to)

  // 3. Route by action type
  if (email_action_type === 'magiclink') {
    // Try to look up org branding from portal slug in the redirect URL
    const slug = parsePortalSlug(redirect_to)
    let orgName       = 'Your portal'
    let orgBrandColor: string | null = null
    let orgLogoUrl:    string | null = null

    if (slug) {
      try {
        const supabase = createAnonClient()
        const { data } = await supabase.rpc('public_get_portal_branding_by_slug', { p_slug: slug })
        if (data) {
          orgName       = (data as { org_name?: string }).org_name       ?? orgName
          orgBrandColor = (data as { brand_color?: string }).brand_color ?? null
          orgLogoUrl    = (data as { logo_url?: string }).logo_url       ?? null
        }
      } catch (err) {
        console.warn('[email-hook] branding lookup failed, using defaults:', err)
      }
    }

    const { error } = await sendPortalMagicLinkEmail({
      to,
      confirmationUrl,
      orgName,
      orgBrandColor,
      orgLogoUrl,
    })

    if (error) {
      console.error('[email-hook] sendPortalMagicLinkEmail failed:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({})
  }

  // 4. All other types (recovery, signup, email_change, etc.)
  const { error } = await sendAuthEmail({
    to,
    actionType:      email_action_type,
    confirmationUrl,
  })

  if (error) {
    console.error('[email-hook] sendAuthEmail failed:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({})
}
