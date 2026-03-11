// =============================================================================
// LUSTRE — Revenue & Sales Analytics Queries
// Feature: FEAT-REV-001 Phase 1 + Phase 2
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

// ── Revenue Trend (daily or weekly) ──────────────────────────────────────────

export interface TrendPoint {
  date: string    // YYYY-MM-DD — day date or Monday of the week
  revenue: number
}

/** Returns the ISO date of the Monday of the week containing `isoDate`. */
function getMondayOfWeek(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const day = d.getUTCDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export async function getRevenueTrend(
  basis: RevenueBasis,
  days: number = 30,
  groupBy: 'day' | 'week' = 'day',
): Promise<TrendPoint[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Pre-fill every bucket with 0 so gaps render as empty bars
  const dateMap: Record<string, number> = {}
  if (groupBy === 'day') {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dateMap[d.toISOString().slice(0, 10)] = 0
    }
  } else {
    // Weekly: seed every Monday in the range
    const cursor = new Date(Date.now() - days * 86400000)
    const day = cursor.getUTCDay()
    cursor.setUTCDate(cursor.getUTCDate() + (day === 0 ? 1 : day === 1 ? 0 : 8 - day))
    while (cursor.getTime() <= Date.now()) {
      dateMap[cursor.toISOString().slice(0, 10)] = 0
      cursor.setUTCDate(cursor.getUTCDate() + 7)
    }
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
      const isoDate = (job.completed_at as string).slice(0, 10)
      const key = groupBy === 'week' ? getMondayOfWeek(isoDate) : isoDate
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
      const isoDate = (quote.responded_at as string).slice(0, 10)
      const key = groupBy === 'week' ? getMondayOfWeek(isoDate) : isoDate
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
      const client = job.clients as unknown as { first_name: string; last_name: string } | null
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
      const client = quote.clients as unknown as { first_name: string; last_name: string } | null
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

// ── Quote Pipeline Funnel ─────────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'

export interface QuoteFunnelStage {
  status: QuoteStatus
  count: number
  totalValue: number
}

export async function getQuoteFunnel(days: number = 90): Promise<QuoteFunnelStage[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('status, total')
    .eq('organisation_id', orgId)
    .gte('created_at', since)

  const stages: Record<QuoteStatus, { count: number; totalValue: number }> = {
    draft:    { count: 0, totalValue: 0 },
    sent:     { count: 0, totalValue: 0 },
    viewed:   { count: 0, totalValue: 0 },
    accepted: { count: 0, totalValue: 0 },
    declined: { count: 0, totalValue: 0 },
    expired:  { count: 0, totalValue: 0 },
  }

  for (const quote of quotes ?? []) {
    const s = quote.status as QuoteStatus
    if (s in stages) {
      stages[s].count += 1
      stages[s].totalValue += quote.total ?? 0
    }
  }

  return (Object.keys(stages) as QuoteStatus[]).map(status => ({
    status,
    count: stages[status].count,
    totalValue: stages[status].totalValue,
  }))
}

// ── Pipeline Health Metrics ───────────────────────────────────────────────────

export interface PipelineHealth {
  totalPipelineValue: number
  avgDaysToClose: number | null  // mean days from sent_at → responded_at (accepted quotes)
  quotesAtRisk: number           // valid_until within 7 days, no response yet
  winRate: number | null         // accepted / (accepted + declined), 0–1
}

export async function getPipelineHealth(days: number = 90): Promise<PipelineHealth> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const since = new Date(Date.now() - days * 86400000).toISOString()
  const todayIso = new Date().toISOString().slice(0, 10)
  const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [
    { data: openQuotes },
    { data: closedQuotes },
    { data: atRiskQuotes },
  ] = await Promise.all([
    // Open pipeline: sent or viewed, no date filter (shows live position)
    supabase
      .from('quotes')
      .select('total')
      .eq('organisation_id', orgId)
      .in('status', ['sent', 'viewed'])
      .not('total', 'is', null),

    // Closed quotes in period for win rate + time-to-close
    supabase
      .from('quotes')
      .select('status, sent_at, responded_at')
      .eq('organisation_id', orgId)
      .in('status', ['accepted', 'declined'])
      .gte('responded_at', since)
      .not('sent_at', 'is', null)
      .not('responded_at', 'is', null),

    // Quotes expiring within 7 days with no response
    supabase
      .from('quotes')
      .select('id')
      .eq('organisation_id', orgId)
      .in('status', ['sent', 'viewed'])
      .gte('valid_until', todayIso)
      .lte('valid_until', sevenDaysOut),
  ])

  const totalPipelineValue = (openQuotes ?? []).reduce(
    (s: number, q: { total: number | null }) => s + (q.total ?? 0), 0,
  )

  type ClosedQuote = { status: string; sent_at: string; responded_at: string }
  const accepted = (closedQuotes ?? []).filter((q: ClosedQuote) => q.status === 'accepted')
  const declined = (closedQuotes ?? []).filter((q: ClosedQuote) => q.status === 'declined')

  let avgDaysToClose: number | null = null
  if (accepted.length > 0) {
    const totalDays = accepted.reduce((s: number, q: ClosedQuote) => {
      const msPerDay = 86400000
      return s + (new Date(q.responded_at).getTime() - new Date(q.sent_at).getTime()) / msPerDay
    }, 0)
    avgDaysToClose = Math.round((totalDays / accepted.length) * 10) / 10
  }

  const totalDecided = accepted.length + declined.length

  return {
    totalPipelineValue,
    avgDaysToClose,
    quotesAtRisk: (atRiskQuotes ?? []).length,
    winRate: totalDecided > 0 ? accepted.length / totalDecided : null,
  }
}

// ── Revenue by Service Type ───────────────────────────────────────────────────

export interface ServiceTypeRevenue {
  name: string
  totalRevenue: number
  count: number
  avgValue: number
}

// Only meaningful for the 'earned' basis — quotes are not linked to job types.
export async function getRevenueByServiceType(
  basis: RevenueBasis,
  days: number = 30,
): Promise<ServiceTypeRevenue[]> {
  if (basis !== 'earned') return []

  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('price, job_types(name)')
    .eq('organisation_id', orgId)
    .eq('status', 'completed')
    .gte('completed_at', since)
    .not('price', 'is', null)

  const map: Record<string, { total: number; count: number }> = {}

  for (const job of jobs ?? []) {
    const typeName = (job.job_types as unknown as { name: string } | null)?.name ?? 'Uncategorised'
    if (!map[typeName]) map[typeName] = { total: 0, count: 0 }
    map[typeName].total += job.price ?? 0
    map[typeName].count += 1
  }

  return Object.entries(map)
    .map(([name, v]) => ({
      name,
      totalRevenue: v.total,
      count: v.count,
      avgValue: v.count > 0 ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ── Client Lifetime Value (Business+) ─────────────────────────────────────────

export type ChurnRisk = 'none' | 'at_risk' | 'high_risk'

export interface ClientLifetimeValue {
  clientId: string
  name: string
  email: string | null
  totalRevenue: number
  jobCount: number
  avgJobValue: number
  firstJobDate: string | null
  lastJobDate: string | null
  churnRisk: ChurnRisk  // at_risk = 61–90d, high_risk = 90d+, none otherwise
}

export async function getClientLifetimeValues(): Promise<ClientLifetimeValue[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const [{ data: clients }, { data: jobs }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('organisation_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('client_id, price, completed_at')
      .eq('organisation_id', orgId)
      .eq('status', 'completed')
      .not('price', 'is', null),
  ])

  // Build revenue map from jobs
  type JobMap = Record<string, { total: number; count: number; first: string | null; last: string | null }>
  const jobMap: JobMap = {}
  for (const job of jobs ?? []) {
    const cid = job.client_id as string
    const d = job.completed_at as string | null
    if (!jobMap[cid]) jobMap[cid] = { total: 0, count: 0, first: null, last: null }
    jobMap[cid].total += job.price ?? 0
    jobMap[cid].count += 1
    if (d) {
      if (!jobMap[cid].first || d < jobMap[cid].first!) jobMap[cid].first = d
      if (!jobMap[cid].last  || d > jobMap[cid].last!)  jobMap[cid].last  = d
    }
  }

  const now = Date.now()
  const DAY = 86400000

  return (clients ?? []).map(c => {
    const stats = jobMap[c.id as string]
    const lastJobDate = stats?.last ?? null
    const daysSinceLast = lastJobDate
      ? Math.floor((now - new Date(lastJobDate).getTime()) / DAY)
      : null

    let churnRisk: ChurnRisk = 'none'
    if (daysSinceLast !== null && stats && stats.count > 0) {
      if (daysSinceLast > 90) churnRisk = 'high_risk'
      else if (daysSinceLast > 60) churnRisk = 'at_risk'
    }

    const jobCount = stats?.count ?? 0
    const totalRevenue = stats?.total ?? 0

    return {
      clientId: c.id as string,
      name: `${c.first_name} ${c.last_name}`,
      email: (c.email as string | null),
      totalRevenue,
      jobCount,
      avgJobValue: jobCount > 0 ? totalRevenue / jobCount : 0,
      firstJobDate: stats?.first ?? null,
      lastJobDate,
      churnRisk,
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ── Team Performance (Business+) ─────────────────────────────────────────────

export interface TeamMemberPerformance {
  profileId: string
  name: string
  jobCount: number
  totalRevenue: number
  avgJobValue: number
}

export async function getTeamPerformance(days: number = 365): Promise<TeamMemberPerformance[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const since = new Date(Date.now() - days * 86400000).toISOString()

  const [{ data: jobs }, { data: profiles }] = await Promise.all([
    supabase
      .from('jobs')
      .select('assigned_to, price, completed_at')
      .eq('organisation_id', orgId)
      .eq('status', 'completed')
      .gte('completed_at', since)
      .not('price', 'is', null)
      .not('assigned_to', 'is', null),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organisation_id', orgId),
  ])

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id as string] = (p.full_name as string) || 'Unknown'
  }

  type PerfMap = Record<string, { total: number; count: number }>
  const map: PerfMap = {}
  for (const job of jobs ?? []) {
    const pid = job.assigned_to as string
    if (!map[pid]) map[pid] = { total: 0, count: 0 }
    map[pid].total += job.price ?? 0
    map[pid].count += 1
  }

  return Object.entries(map)
    .map(([profileId, v]) => ({
      profileId,
      name: profileMap[profileId] ?? 'Unknown',
      jobCount: v.count,
      totalRevenue: v.total,
      avgJobValue: v.count > 0 ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ── Win / Loss Trend (Business+ — always trailing 12 months) ─────────────────

export interface MonthlyWinRate {
  month: string        // YYYY-MM label
  accepted: number
  declined: number
  winRate: number | null  // null when no decided quotes that month
}

export async function getWinLossTrend(months: number = 12): Promise<MonthlyWinRate[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgContext()

  const since = new Date()
  since.setMonth(since.getMonth() - months)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const { data: quotes } = await supabase
    .from('quotes')
    .select('status, responded_at')
    .eq('organisation_id', orgId)
    .in('status', ['accepted', 'declined'])
    .gte('responded_at', since.toISOString())
    .not('responded_at', 'is', null)

  // Seed all months in range
  const monthMap: Record<string, { accepted: number; declined: number }> = {}
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap[key] = { accepted: 0, declined: 0 }
  }

  for (const q of quotes ?? []) {
    const key = (q.responded_at as string).slice(0, 7)
    if (key in monthMap) {
      if (q.status === 'accepted') monthMap[key].accepted += 1
      else monthMap[key].declined += 1
    }
  }

  return Object.entries(monthMap).map(([month, v]) => {
    const total = v.accepted + v.declined
    return {
      month,
      accepted: v.accepted,
      declined: v.declined,
      winRate: total > 0 ? v.accepted / total : null,
    }
  })
}

// ── Invoice billing KPIs ───────────────────────────────────────────────────────
// Shows the freelancer's invoice health: what's been invoiced, what's been
// collected, what's outstanding, and average days to payment.

export interface InvoiceKpis {
  invoicedMtd:       number   // total invoiced this calendar month
  invoicedLastMonth: number
  collectedMtd:      number   // amount_paid on invoices paid this month
  outstanding:       number   // total – amount_paid on all unpaid sent/overdue
  overdueAmount:     number   // subset of outstanding that is overdue
  paidRateMtd:       number | null   // collectedMtd / invoicedMtd, null if 0
  avgDaysToPayment:  number | null   // avg calendar days between issue and paid_at
  plan:              Plan
}

export async function getInvoiceKpis(): Promise<InvoiceKpis> {
  const supabase = await createClient()
  const { orgId, plan } = await getOrgContext()

  const now            = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    { data: mtdInvoices },
    { data: lastMonthInvoices },
    { data: unpaid },
    { data: paidWithDates },
  ] = await Promise.all([
    // Invoiced this month (not void)
    supabase
      .from('invoices')
      .select('total')
      .eq('organisation_id', orgId)
      .gte('issue_date', monthStart.slice(0, 10))
      .neq('status', 'void'),
    // Invoiced last month
    supabase
      .from('invoices')
      .select('total')
      .eq('organisation_id', orgId)
      .gte('issue_date', lastMonthStart.slice(0, 10))
      .lt('issue_date', monthStart.slice(0, 10))
      .neq('status', 'void'),
    // Unpaid (sent or overdue) — for outstanding + overdue amounts
    supabase
      .from('invoices')
      .select('total, amount_paid, status')
      .eq('organisation_id', orgId)
      .in('status', ['sent', 'viewed', 'overdue']),
    // Paid invoices with dates — for avg days to payment
    supabase
      .from('invoices')
      .select('issue_date, paid_at, amount_paid')
      .eq('organisation_id', orgId)
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .not('issue_date', 'is', null),
  ])

  const invoicedMtd       = (mtdInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
  const invoicedLastMonth = (lastMonthInvoices ?? []).reduce((s, i) => s + (i.total ?? 0), 0)

  // Collected this month: amount_paid on invoices with paid_at >= monthStart
  // We approximate with amount_paid for simplicity (no paid_at filter on this set)
  const { data: paidThisMonth } = await supabase
    .from('invoices')
    .select('amount_paid')
    .eq('organisation_id', orgId)
    .eq('status', 'paid')
    .gte('paid_at', monthStart)

  const collectedMtd = (paidThisMonth ?? []).reduce((s, i) => s + (i.amount_paid ?? 0), 0)

  let outstanding  = 0
  let overdueAmount = 0
  for (const inv of unpaid ?? []) {
    const owed = Math.max(0, (inv.total ?? 0) - (inv.amount_paid ?? 0))
    outstanding += owed
    if (inv.status === 'overdue') overdueAmount += owed
  }

  // Average days from issue_date to paid_at (on paid invoices)
  let avgDaysToPayment: number | null = null
  const paidRows = paidWithDates ?? []
  if (paidRows.length > 0) {
    const totalDays = paidRows.reduce((s, inv) => {
      const issued = new Date(inv.issue_date as string).getTime()
      const paid   = new Date(inv.paid_at as string).getTime()
      return s + (paid - issued) / 86400000
    }, 0)
    avgDaysToPayment = Math.round(totalDays / paidRows.length)
  }

  return {
    invoicedMtd,
    invoicedLastMonth,
    collectedMtd,
    outstanding,
    overdueAmount,
    paidRateMtd: invoicedMtd > 0 ? (collectedMtd / invoicedMtd) : null,
    avgDaysToPayment,
    plan,
  }
}
