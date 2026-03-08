// =============================================================================
// LUSTRE — Revenue & Sales Analytics Queries
// Feature: FEAT-REV-001 Phase 1
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/lib/types'

// Re-export client-safe plan utilities so callers can import from one place.
export { planAtLeast } from '@/lib/utils/plan'

export type RevenueBasis = 'earned' | 'committed'

// 'earned'    = completed jobs (money in / realised revenue)
// 'committed' = accepted quotes (contracted but not yet necessarily invoiced)

// ── Org context helper ────────────────────────────────────────────────────────

interface OrgContext {
  orgId: string
  plan: Plan
}

async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, organisations(plan)')
    .eq('id', user.id)
    .single()

  if (!profile?.organisation_id) throw new Error('No organisation found')

  const org = profile.organisations as unknown as { plan: Plan } | null
  return {
    orgId: profile.organisation_id,
    plan: org?.plan ?? 'starter',
  }
}

// ── KPI Data ──────────────────────────────────────────────────────────────────

export interface RevenueKpis {
  revenueMtd: number
  revenueLastMonth: number
  revenueChangePct: number | null   // null when last month had zero revenue
  avgValueMtd: number
  outstandingQuoteValue: number
  quoteConversionRate: number | null // 0–1, null when no quotes have been sent
  countMtd: number                   // jobs completed or quotes accepted this month
  plan: Plan
}

export async function getRevenueKpis(basis: RevenueBasis): Promise<RevenueKpis> {
  const supabase = await createClient()
  const { orgId, plan } = await getOrgContext()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = monthStart // exclusive upper bound

  // Quote conversion rate is basis-independent — always trailing 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const conversionPromise = supabase
    .from('quotes')
    .select('status')
    .eq('organisation_id', orgId)
    .gte('sent_at', thirtyDaysAgo)
    .in('status', ['sent', 'viewed', 'accepted', 'declined', 'expired'])

  // Outstanding pipeline value — basis-independent
  const outstandingPromise = supabase
    .from('quotes')
    .select('total')
    .eq('organisation_id', orgId)
    .in('status', ['sent', 'viewed'])
    .not('total', 'is', null)

  if (basis === 'earned') {
    const [
      { data: mtdJobs },
      { data: lastMonthJobs },
      { data: openQuotes },
      { data: sentQuotes },
    ] = await Promise.all([
      supabase
        .from('jobs')
        .select('price, completed_at')
        .eq('organisation_id', orgId)
        .eq('status', 'completed')
        .gte('completed_at', monthStart)
        .not('price', 'is', null),
      supabase
        .from('jobs')
        .select('price')
        .eq('organisation_id', orgId)
        .eq('status', 'completed')
        .gte('completed_at', lastMonthStart)
        .lt('completed_at', lastMonthEnd)
        .not('price', 'is', null),
      outstandingPromise,
      conversionPromise,
    ])

    const revenueMtd = (mtdJobs ?? []).reduce((s: number, j: { price: number | null }) => s + (j.price ?? 0), 0)
    const revenueLastMonth = (lastMonthJobs ?? []).reduce((s: number, j: { price: number | null }) => s + (j.price ?? 0), 0)
    const countMtd = (mtdJobs ?? []).length
    const avgValueMtd = countMtd > 0 ? revenueMtd / countMtd : 0
    const outstandingQuoteValue = (openQuotes ?? []).reduce((s: number, q: { total: number | null }) => s + (q.total ?? 0), 0)

    const totalSent = (sentQuotes ?? []).length
    const totalAccepted = (sentQuotes ?? []).filter((q: { status: string }) => q.status === 'accepted').length

    return {
      revenueMtd,
      revenueLastMonth,
      revenueChangePct: revenueLastMonth > 0
        ? ((revenueMtd - revenueLastMonth) / revenueLastMonth) * 100
        : null,
      avgValueMtd,
      outstandingQuoteValue,
      quoteConversionRate: totalSent > 0 ? totalAccepted / totalSent : null,
      countMtd,
      plan,
    }
  } else {
    // committed — accepted quotes
    const [
      { data: mtdQuotes },
      { data: lastMonthQuotes },
      { data: openQuotes },
      { data: sentQuotes },
    ] = await Promise.all([
      supabase
        .from('quotes')
        .select('total, responded_at')
        .eq('organisation_id', orgId)
        .eq('status', 'accepted')
        .gte('responded_at', monthStart)
        .not('total', 'is', null),
      supabase
        .from('quotes')
        .select('total')
        .eq('organisation_id', orgId)
        .eq('status', 'accepted')
        .gte('responded_at', lastMonthStart)
        .lt('responded_at', lastMonthEnd)
        .not('total', 'is', null),
      outstandingPromise,
      conversionPromise,
    ])

    const revenueMtd = (mtdQuotes ?? []).reduce((s: number, q: { total: number | null }) => s + (q.total ?? 0), 0)
    const revenueLastMonth = (lastMonthQuotes ?? []).reduce((s: number, q: { total: number | null }) => s + (q.total ?? 0), 0)
    const countMtd = (mtdQuotes ?? []).length
    const avgValueMtd = countMtd > 0 ? revenueMtd / countMtd : 0
    const outstandingQuoteValue = (openQuotes ?? []).reduce((s: number, q: { total: number | null }) => s + (q.total ?? 0), 0)

    const totalSent = (sentQuotes ?? []).length
    const totalAccepted = (sentQuotes ?? []).filter((q: { status: string }) => q.status === 'accepted').length

    return {
      revenueMtd,
      revenueLastMonth,
      revenueChangePct: revenueLastMonth > 0
        ? ((revenueMtd - revenueLastMonth) / revenueLastMonth) * 100
        : null,
      avgValueMtd,
      outstandingQuoteValue,
      quoteConversionRate: totalSent > 0 ? totalAccepted / totalSent : null,
      countMtd,
      plan,
    }
  }
}

// ── Revenue Trend (daily, last N days) ───────────────────────────────────────

export interface DailyRevenue {
  date: string    // YYYY-MM-DD
  revenue: number
}

export async function getRevenueTrend(
  basis: RevenueBasis,
  days: number = 30,
): Promise<DailyRevenue[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Pre-fill every date in the range with 0 so gaps render as empty bars
  const dateMap: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dateMap[d.toISOString().slice(0, 10)] = 0
  }

  if (basis === 'earned') {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('price, completed_at')
      .eq('organisation_id', orgId)
      .eq('status', 'completed')
      .gte('completed_at', since)
      .not('price', 'is', null)
      .not('completed_at', 'is', null)

    for (const job of jobs ?? []) {
      const key = (job.completed_at as string).slice(0, 10)
      if (key in dateMap) dateMap[key] += job.price ?? 0
    }
  } else {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('total, responded_at')
      .eq('organisation_id', orgId)
      .eq('status', 'accepted')
      .gte('responded_at', since)
      .not('total', 'is', null)
      .not('responded_at', 'is', null)

    for (const quote of quotes ?? []) {
      const key = (quote.responded_at as string).slice(0, 10)
      if (key in dateMap) dateMap[key] += quote.total ?? 0
    }
  }

  return Object.entries(dateMap).map(([date, revenue]) => ({ date, revenue }))
}

// ── Top Clients by Revenue ────────────────────────────────────────────────────

export interface ClientRevenueSummary {
  clientId: string
  name: string
  totalRevenue: number
  count: number            // jobs completed or quotes accepted
  lastActivityDate: string | null
}

export async function getTopClients(
  basis: RevenueBasis,
  limit: number = 5,
): Promise<ClientRevenueSummary[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  type ClientMap = Record<string, {
    name: string
    total: number
    count: number
    lastDate: string | null
  }>

  if (basis === 'earned') {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('client_id, price, completed_at, clients(first_name, last_name)')
      .eq('organisation_id', orgId)
      .eq('status', 'completed')
      .not('price', 'is', null)

    const map: ClientMap = {}
    for (const job of jobs ?? []) {
      const cid = job.client_id as string
      const client = job.clients as { first_name: string; last_name: string } | null
      if (!map[cid]) {
        map[cid] = {
          name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
          total: 0,
          count: 0,
          lastDate: null,
        }
      }
      map[cid].total += job.price ?? 0
      map[cid].count += 1
      const d = job.completed_at as string | null
      if (d && (!map[cid].lastDate || d > map[cid].lastDate!)) map[cid].lastDate = d
    }

    return Object.entries(map)
      .map(([clientId, v]) => ({
        clientId,
        name: v.name,
        totalRevenue: v.total,
        count: v.count,
        lastActivityDate: v.lastDate,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
  } else {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('client_id, total, responded_at, clients(first_name, last_name)')
      .eq('organisation_id', orgId)
      .eq('status', 'accepted')
      .not('total', 'is', null)

    const map: ClientMap = {}
    for (const quote of quotes ?? []) {
      const cid = quote.client_id as string
      const client = quote.clients as { first_name: string; last_name: string } | null
      if (!map[cid]) {
        map[cid] = {
          name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
          total: 0,
          count: 0,
          lastDate: null,
        }
      }
      map[cid].total += quote.total ?? 0
      map[cid].count += 1
      const d = quote.responded_at as string | null
      if (d && (!map[cid].lastDate || d > map[cid].lastDate!)) map[cid].lastDate = d
    }

    return Object.entries(map)
      .map(([clientId, v]) => ({
        clientId,
        name: v.name,
        totalRevenue: v.total,
        count: v.count,
        lastActivityDate: v.lastDate,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
  }
}
