// __checks__/stripe-webhook.spec.ts
// Sends a properly HMAC-signed POST to /api/webhooks/stripe.
// The handler verifies the signature and returns 200 for unrecognised event types.
// Requires STRIPE_WEBHOOK_SECRET in Checkly environment variables.

import { test, expect } from '@playwright/test'
import crypto from 'crypto'

const BASE_URL = process.env.ENVIRONMENT_URL ?? 'https://app.simplylustre.com'

test('Stripe webhook returns 200 with valid signature', async ({ request }) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  // Minimal payload — 'ping' is not a handled event type, so the handler
  // falls through to the default case and returns { received: true } with 200.
  const payload   = JSON.stringify({ id: 'evt_test_checkly', type: 'ping', data: { object: {} } })
  const timestamp = Math.floor(Date.now() / 1000)

  // Stripe signature: HMAC-SHA256 of "<timestamp>.<payload>" keyed with the full secret string
  const sig = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

  const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
    headers: {
      'Content-Type':    'application/json',
      'stripe-signature': `t=${timestamp},v1=${sig}`,
    },
    data: payload,
  })

  expect(response.status()).toBe(200)
})
