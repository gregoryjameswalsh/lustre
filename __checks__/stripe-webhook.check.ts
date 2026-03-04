// __checks__/stripe-webhook.check.ts
// Confirms the Stripe webhook endpoint is reachable and not throwing.
// An unsigned POST returns 400 (missing stripe-signature) in a healthy app.
// Any 5xx means the route itself is broken.

import { ApiCheck, AssertionBuilder } from '@checkly/cli/constructs'

const baseUrl = process.env.ENVIRONMENT_URL ?? 'https://app.simplylustre.com'

new ApiCheck('stripe-webhook', {
  name:      'Stripe webhook endpoint',
  activated: true,
  frequency: 5,
  locations: ['eu-west-1', 'eu-central-1'],
  tags:      ['production'],
  maxResponseTime: 5000,
  request: {
    url:    `${baseUrl}/api/webhooks/stripe`,
    method: 'POST',
    body:   '{}',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    assertions: [
      AssertionBuilder.statusCode().lessThan(500),
    ],
  },
})
