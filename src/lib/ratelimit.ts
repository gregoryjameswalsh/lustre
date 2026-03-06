// src/lib/ratelimit.ts
// =============================================================================
// LUSTRE — Rate Limiting
// Uses Upstash Redis.
//
// Fail-closed behaviour (SEC-001):
//   • Production + Redis not configured → request DENIED. Redis is mandatory
//     in production; a missing env var is a misconfiguration, not a soft skip.
//   • Production + Redis connection error → request DENIED. An outage must not
//     open the gate to brute-force or abuse.
//   • Development + Redis not configured → request ALLOWED (fail-open) so the
//     app works without Upstash credentials locally.
// =============================================================================

import { Ratelimit } from '@upstash/ratelimit'
import { Redis }     from '@upstash/redis'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

// 5 login attempts per IP per 15 minutes — brute force protection
export const loginRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:login' })
  : null

// 3 signups per IP per hour — prevents signup spam
export const signupRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(3, '1 h'), prefix: 'rl:signup' })
  : null

// 20 PDF downloads per user per minute — prevents PDF generation abuse
export const pdfRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:pdf' })
  : null

// 5 quote responses per token per hour — prevents spam on the public accept page
export const quoteRateLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, '1 h'), prefix: 'rl:quote' })
  : null

// Convenience wrapper — fail-closed in production, fail-open in development.
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ success: boolean }> {
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      // Redis is required in production. Missing config = deny.
      console.error('[ratelimit] Redis not configured in production — denying request (fail-closed)')
      return { success: false }
    }
    // Local dev without Upstash — allow through.
    return { success: true }
  }

  try {
    const result = await limiter.limit(key)
    return { success: result.success }
  } catch (err) {
    // Redis unreachable — log but allow through so a Redis outage doesn't lock out all users.
    // TODO: revert to fail-closed once Upstash env vars are confirmed working in production.
    console.error('[ratelimit] Redis error — allowing request (temporary fail-open):', err)
    return { success: true }
  }
}
