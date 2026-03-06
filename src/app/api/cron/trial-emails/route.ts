// src/app/api/cron/trial-emails/route.ts
// =============================================================================
// LUSTRE — Trial nurture email cron job
// Runs daily (configured in vercel.json). Sends Days 7, 10, 13, 14 trial
// emails to orgs whose trial started the matching number of days ago.
// Day 1 is sent directly on onboarding completion (see lib/actions/auth.ts).
//
// Security: requires the CRON_SECRET header set by Vercel's cron scheduler.
// Locally: POST /api/cron/trial-emails with x-cron-secret header.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { sendTrialEmail, type TrialEmailKey } from '@/lib/email'

const CRON_EMAIL_KEYS: TrialEmailKey[] = ['day7', 'day10', 'day13', 'day14']

// Anon client — all DB access goes through SECURITY DEFINER functions
function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel's cron scheduler (or a trusted source)
  const secret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const supabase   = createAnonClient()
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simplylustre.com'
  const upgradeUrl = `${appUrl}/billing`

  const results: Array<{ key: string; sent: number; failed: number }> = []

  for (const key of CRON_EMAIL_KEYS) {
    let sent   = 0
    let failed = 0

    const { data: orgs, error } = await supabase.rpc('get_orgs_needing_trial_email', {
      p_email_key: key,
    })

    if (error) {
      console.error(`cron/trial-emails: DB error for ${key}:`, error)
      results.push({ key, sent: 0, failed: -1 })
      continue
    }

    for (const org of (orgs ?? [])) {
      // Record before sending — idempotent, prevents duplicate sends on retry
      await supabase.rpc('record_trial_email_sent', {
        p_org_id:    org.org_id,
        p_email_key: key,
      })

      const { error: emailError } = await sendTrialEmail({
        to:         org.admin_email,
        orgName:    org.org_name,
        key,
        upgradeUrl,
      })

      if (emailError) {
        console.error(`cron/trial-emails: email failed for ${org.org_id} (${key}):`, emailError)
        failed++
      } else {
        sent++
      }
    }

    results.push({ key, sent, failed })
  }

  console.log('cron/trial-emails completed:', results)
  return NextResponse.json({ ok: true, results })
}
