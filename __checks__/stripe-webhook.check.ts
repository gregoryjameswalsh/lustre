// __checks__/stripe-webhook.check.ts
// Sends a properly signed POST to the Stripe webhook endpoint and expects 200.
// Requires STRIPE_WEBHOOK_SECRET to be set in Checkly environment variables.

import { BrowserCheck } from '@checkly/cli/constructs'

new BrowserCheck('stripe-webhook', {
  name:      'Stripe webhook endpoint',
  activated: true,
  frequency: 5,
  locations: ['eu-west-1', 'eu-central-1'],
  tags:      ['production'],
  maxResponseTime: 5000,
  code: { entrypoint: './stripe-webhook.spec.ts' },
})
