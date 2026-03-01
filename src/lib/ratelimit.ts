// src/lib/ratelimit.ts
// =============================================================================
// LUSTRE — Rate Limiting
// Uses Upstash Redis. If UPSTASH_REDIS_REST_URL / TOKEN are not set (e.g. in
// local dev without Redis), all checks fail-open so the app keeps working.
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

// Convenience wrapper — returns success:true (fail open) if Redis isn't configured
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<{ success: boolean }> {
  if (!limiter) return { success: true }
  const result = await limiter.limit(key)
  return { success: result.success }
}
