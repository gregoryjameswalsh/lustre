// src/app/api/cron/daily/route.ts
// =============================================================================
// LUSTRE — Daily cron job
//
// Called by Vercel Cron at 07:00 UTC every day (see vercel.json).
// Vercel automatically sends Authorization: Bearer $CRON_SECRET — we verify
// it before doing anything.
//
// Two SECURITY DEFINER RPC functions handle all DB work atomically (mark rows
// and return data in one CTE), so no service role key is needed in application
// code. The anon client calls them exactly as the Stripe webhook does.
//
// Jobs:
//   cron_expire_quotes()       — marks overdue quotes 'expired', returns rows
//   cron_get_due_follow_ups()  — marks due follow-ups reminded, returns rows
//
// Results are grouped by org and one digest email is sent per org per job.
// =============================================================================

import { NextResponse }      from 'next/server'
import { createAnonClient }  from '@/lib/supabase/anon'
import {
  sendExpiredQuotesDigest,
  sendFollowUpDigest,
  type ExpiredQuote,
  type DueFollowUp,
} from '@/lib/email'

// ---------------------------------------------------------------------------
// Auth guard — Vercel injects the CRON_SECRET as a Bearer token
// ---------------------------------------------------------------------------

function isAuthorised(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// Job 1 — Expire quotes and notify operators
// ---------------------------------------------------------------------------

async function runExpireQuotes(
  supabase: ReturnType<typeof createAnonClient>,
  appUrl: string
): Promise<number> {
  const { data, error } = await supabase.rpc('cron_expire_quotes')

  if (error) {
    console.error('[cron/daily] cron_expire_quotes error:', error)
    return 0
  }
  if (!data || data.length === 0) return 0

  type Row = {
    quote_id: string; quote_number: string; title: string; total: number
    valid_until: string; org_id: string; org_name: string; org_email: string
    client_first: string; client_last: string
  }

  // Group by org, send one digest per org
  const byOrg = new Map<string, { orgEmail: string; orgName: string; quotes: ExpiredQuote[] }>()

  for (const row of data as Row[]) {
    if (!byOrg.has(row.org_id)) {
      byOrg.set(row.org_id, { orgEmail: row.org_email, orgName: row.org_name, quotes: [] })
    }
    byOrg.get(row.org_id)!.quotes.push({
      quoteNumber:  row.quote_number,
      title:        row.title,
      total:        row.total,
      clientName:   `${row.client_first} ${row.client_last}`.trim(),
      validUntil:   row.valid_until,
      dashboardUrl: `${appUrl}/dashboard/quotes/${row.quote_id}`,
    })
  }

  await Promise.all(
    Array.from(byOrg.values()).map(({ orgEmail, orgName, quotes }) =>
      sendExpiredQuotesDigest(orgEmail, orgName, quotes)
    )
  )

  return data.length
}

// ---------------------------------------------------------------------------
// Job 2 — Follow-up reminders
// ---------------------------------------------------------------------------

async function runFollowUpReminders(
  supabase: ReturnType<typeof createAnonClient>,
  appUrl: string
): Promise<number> {
  const { data, error } = await supabase.rpc('cron_get_due_follow_ups')

  if (error) {
    console.error('[cron/daily] cron_get_due_follow_ups error:', error)
    return 0
  }
  if (!data || data.length === 0) return 0

  type Row = {
    follow_up_id: string; title: string; notes: string | null; due_date: string
    priority: string; org_id: string; org_name: string; org_email: string
    client_first: string; client_last: string
  }

  // Group by org, send one digest per org
  const byOrg = new Map<string, { orgEmail: string; orgName: string; followUps: DueFollowUp[] }>()

  for (const row of data as Row[]) {
    if (!byOrg.has(row.org_id)) {
      byOrg.set(row.org_id, { orgEmail: row.org_email, orgName: row.org_name, followUps: [] })
    }
    byOrg.get(row.org_id)!.followUps.push({
      title:      row.title,
      clientName: `${row.client_first} ${row.client_last}`.trim(),
      dueDate:    row.due_date,
      priority:   row.priority,
      notes:      row.notes,
    })
  }

  await Promise.all(
    Array.from(byOrg.values()).map(({ orgEmail, orgName, followUps }) =>
      sendFollowUpDigest(orgEmail, orgName, followUps, `${appUrl}/dashboard`)
    )
  )

  return data.length
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

  const supabase = createAnonClient()

  const [expiredCount, followUpCount] = await Promise.all([
    runExpireQuotes(supabase, appUrl),
    runFollowUpReminders(supabase, appUrl),
  ])

  console.log(`[cron/daily] done — expired: ${expiredCount}, follow-ups notified: ${followUpCount}`)
  return NextResponse.json({ expired: expiredCount, followUpsNotified: followUpCount })
}
