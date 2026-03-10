// src/lib/queries/quotes.ts
// =============================================================================
// LUSTRE — Quote Queries
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { clampLimit, buildPaginatedResult, decodeCursor, pgVal } from '@/lib/pagination'
import type { PaginationParams, PaginatedResult } from '@/lib/types/pagination'

export type QuoteWithClient = {
  id: string
  quote_number: string
  title: string
  status: string
  pricing_type: string
  fixed_price: number | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  internal_notes: string | null
  valid_until: string | null
  accept_token: string
  sent_at: string | null
  viewed_at: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
  job_id: string | null
  client_id: string
  property_id: string | null
  created_by: string
  organisation_id: string
  clients: {
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  }
  properties: {
    address_line1: string
    town: string
    postcode: string
  } | null
  quote_line_items: {
    id: string
    description: string
    quantity: number
    unit_price: number
    amount: number
    is_addon: boolean
    sort_order: number
  }[]
}

// -----------------------------------------------------------------------------
// Get paginated quotes for the org
// -----------------------------------------------------------------------------

export async function getQuotes(
  status?: string,
  pagination?: PaginationParams,
): Promise<PaginatedResult<{
  id: string
  quote_number: string
  title: string
  total: number
  status: string
  valid_until: string | null
  created_at: string
  clients?: { first_name: string; last_name: string; email: string | null }[] | null
}>> {
  const supabase = await createClient()

  const limit       = clampLimit(pagination?.limit)
  const isFirstPage = !pagination?.after && !pagination?.before
  const direction   = pagination?.before ? 'backward' : 'forward'

  let query = supabase
    .from('quotes')
    .select(`
      id, quote_number, title, status, pricing_type,
      fixed_price, subtotal, tax_rate, tax_amount, total,
      valid_until, sent_at, viewed_at, responded_at,
      created_at, updated_at, job_id, client_id,
      clients ( first_name, last_name, email )
    `)
    .limit(limit + 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (pagination?.after) {
    const cursor = decodeCursor(pagination.after)
    if (cursor) {
      query = query.or(
        `created_at.lt.${pgVal(cursor.created_at)},and(created_at.eq.${pgVal(cursor.created_at)},id.lt.${pgVal(cursor.id)})`
      )
    }
  } else if (pagination?.before) {
    const cursor = decodeCursor(pagination.before)
    if (cursor) {
      query = query.or(
        `created_at.gt.${pgVal(cursor.created_at)},and(created_at.eq.${pgVal(cursor.created_at)},id.gt.${pgVal(cursor.id)})`
      )
    }
  }

  if (direction === 'backward') {
    query = query
      .order('created_at', { ascending: true })
      .order('id',         { ascending: true })
  } else {
    query = query
      .order('created_at', { ascending: false })
      .order('id',         { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error

  return buildPaginatedResult(
    data ?? [],
    limit,
    direction,
    isFirstPage,
    (row) => ({ created_at: row.created_at, id: row.id }),
  )
}

// -----------------------------------------------------------------------------
// Get a single quote with all related data
// -----------------------------------------------------------------------------

export async function getQuote(id: string): Promise<QuoteWithClient | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      clients ( first_name, last_name, email, phone ),
      properties ( address_line1, town, postcode ),
      quote_line_items (
        id, description, quantity, unit_price, amount, is_addon, sort_order
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as QuoteWithClient
}

// -----------------------------------------------------------------------------
// Get quote by accept_token (public — no auth)
// -----------------------------------------------------------------------------

export async function getQuoteByToken(token: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, title, status, pricing_type,
      fixed_price, subtotal, tax_rate, tax_amount, total,
      notes, valid_until, accept_token, responded_at,
      clients ( first_name, last_name ),
      properties ( address_line1, town, postcode ),
      quote_line_items (
        id, description, quantity, unit_price, amount, is_addon, sort_order
      ),
      organisations ( name, phone, email, logo_url, address_line1, town, postcode )
    `)
    .eq('accept_token', token)
    .single()

  if (error) return null
  return data
}

// -----------------------------------------------------------------------------
// Get quotes for a specific client
// -----------------------------------------------------------------------------

export async function getClientQuotes(clientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, title, status, total, valid_until, created_at, job_id
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
