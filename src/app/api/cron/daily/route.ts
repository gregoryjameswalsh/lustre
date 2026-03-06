// src/app/api/cron/daily/route.ts
// =============================================================================
// LUSTRE — Daily cron job
//
// Called by Vercel Cron at 07:00 UTC every day (see vercel.json).
// Vercel automatically sends Authorization: Bearer $CRON_SECRET — we verify
// it before doing anything.
//
// Two jobs run in sequence:
//
//   1. Expire quotes — marks any quote with valid_until < now() and
//      status IN ('sent', 'viewed') as 'expired', then sends a per-org
//      digest email listing the newly-expired quotes.
//
//   2. Follow-up reminders — finds all open follow_ups with
//      due_date <= today AND reminder_sent_at IS NULL, marks them sent,
//      then sends a per-org digest email.
//
// The service role client is used here because both jobs need to read and
// write across all organisations — there is no user session to scope to.
// =============================================================================

import { NextResponse }        from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  sendExpiredQuotesDigest,
  sendFollowUpDigest,
  type ExpiredQuote,
  type DueFollowUp,
} from '@/lib/email'

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isAuthorised(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // If no secret is configured, only allow in development
    return process.env.NODE_ENV === 'development'
  }
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// Job 1 — Expire quotes and notify operators
// ---------------------------------------------------------------------------

async function runExpireQuotes(
  supabase: ReturnType<typeof createServiceClient>,
  appUrl: string
): Promise<number> {
  // Fetch all quotes that should be expired now
  const { data: expiring, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, title, total, valid_until,
      organisations ( id, name, email ),
      clients ( first_name, last_name )
    `)
    .in('status', ['sent', 'viewed'])
    .lt('valid_until', new Date().toISOString())

  if (error) {
    console.error('[cron/daily] expire quotes fetch error:', error)
    return 0
  }
  if (!expiring || expiring.length === 0) return 0

  // Mark them all expired in one go
  const ids = expiring.map(q => q.id)
  const { error: updateError } = await supabase
    .from('quotes')
    .update({ status: 'expired' })
    .in('id', ids)

  if (updateError) {
    console.error('[cron/daily] expire quotes update error:', updateError)
    return 0
  }

  // Group by org and send one digest per org
  type OrgGroup = { orgEmail: string; orgName: string; quotes: ExpiredQuote[] }
  const byOrg = new Map<string, OrgGroup>()

  for (const q of expiring) {
    const org = Array.isArray(q.organisations) ? q.organisations[0] : q.organisations
    const cl  = Array.isArray(q.clients)       ? q.clients[0]       : q.clients
    if (!org?.email || !cl) continue

    const orgId = (org as { id?: string }).id ?? org.email
    if (!byOrg.has(orgId)) {
      byOrg.set(orgId, { orgEmail: org.email, orgName: org.name ?? '', quotes: [] })
    }
    byOrg.get(orgId)!.quotes.push({
      quoteNumber:  q.quote_number,
      title:        q.title,
      total:        q.total,
      clientName:   `${cl.first_name ?? ''} ${cl.last_name ?? ''}`.trim(),
      validUntil:   q.valid_until ?? '',
      dashboardUrl: `${appUrl}/dashboard/quotes/${q.id}`,
    })
  }

  await Promise.all(
    Array.from(byOrg.values()).map(({ orgEmail, orgName, quotes }) =>
      sendExpiredQuotesDigest(orgEmail, orgName, quotes)
    )
  )

  return expiring.length
}

// ---------------------------------------------------------------------------
// Job 2 — Follow-up reminders
// ---------------------------------------------------------------------------

async function runFollowUpReminders(
  supabase: ReturnType<typeof createServiceClient>,
  appUrl: string
): Promise<number> {
  // Due = due_date up to and including today, never reminded yet
  const todayDate = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

  const { data: due, error } = await supabase
    .from('follow_ups')
    .select(`
      id, title, notes, due_date, priority,
      clients ( first_name, last_name ),
      organisations ( id, name, email )
    `)
    .eq('status', 'open')
    .is('reminder_sent_at', null)
    .lte('due_date', todayDate)

  if (error) {
    console.error('[cron/daily] follow-up fetch error:', error)
    return 0
  }
  if (!due || due.length === 0) return 0

  // Mark all as reminded before sending (so a Resend failure doesn't cause re-sends)
  const ids = due.map(f => f.id)
  const { error: updateError } = await supabase
    .from('follow_ups')
    .update({ reminder_sent_at: new Date().toISOString() })
    .in('id', ids)

  if (updateError) {
    console.error('[cron/daily] follow-up update error:', updateError)
    return 0
  }

  // Group by org and send one digest per org
  type OrgGroup = { orgEmail: string; orgName: string; followUps: DueFollowUp[] }
  const byOrg = new Map<string, OrgGroup>()

  for (const f of due) {
    const org = Array.isArray(f.organisations) ? f.organisations[0] : f.organisations
    const cl  = Array.isArray(f.clients)       ? f.clients[0]       : f.clients
    if (!org?.email || !cl) continue

    const orgId = (org as { id?: string }).id ?? org.email
    if (!byOrg.has(orgId)) {
      byOrg.set(orgId, { orgEmail: org.email, orgName: org.name ?? '', followUps: [] })
    }
    byOrg.get(orgId)!.followUps.push({
      title:      f.title,
      clientName: `${cl.first_name ?? ''} ${cl.last_name ?? ''}`.trim(),
      dueDate:    f.due_date ?? todayDate,
      priority:   f.priority,
      notes:      f.notes,
    })
  }

  await Promise.all(
    Array.from(byOrg.values()).map(({ orgEmail, orgName, followUps }) =>
      sendFollowUpDigest(orgEmail, orgName, followUps, `${appUrl}/dashboard`)
    )
  )

  return due.length
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('[cron/daily] NEXT_PUBLIC_APP_URL is not set')
    return NextResponse.json({ error: 'App URL not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  const [expiredCount, followUpCount] = await Promise.all([
    runExpireQuotes(supabase, appUrl),
    runFollowUpReminders(supabase, appUrl),
  ])

  console.log(`[cron/daily] done — expired: ${expiredCount}, follow-ups notified: ${followUpCount}`)
  return NextResponse.json({ expired: expiredCount, followUpsNotified: followUpCount })
}
