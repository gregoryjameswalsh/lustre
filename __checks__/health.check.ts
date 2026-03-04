// __checks__/health.check.ts
// API health check — confirms the app is responding and Next.js is serving.
// Hits /api/health which returns { status: 'ok' } with no auth or DB required.

import { ApiCheck, AssertionBuilder } from '@checkly/cli/constructs'

const baseUrl = process.env.ENVIRONMENT_URL ?? 'https://app.simplylustre.com'

new ApiCheck('health-check', {
  name:      'API health',
  activated: true,
  frequency: 1,
  locations: ['eu-west-1', 'eu-central-1'],
  tags:      ['production', 'critical'],
  maxResponseTime: 5000,
  request: {
    url:    `${baseUrl}/api/health`,
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.status').equals('ok'),
    ],
  },
})
