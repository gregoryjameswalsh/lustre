// __checks__/login.check.ts
// Confirms the login page loads correctly — the entry point for all users.

import { ApiCheck, AssertionBuilder } from '@checkly/cli/constructs'

const baseUrl = process.env.ENVIRONMENT_URL ?? 'https://app.simplylustre.com'

new ApiCheck('login-page', {
  name:      'Login page',
  activated: true,
  frequency: 5,
  locations: ['eu-west-1', 'eu-central-1'],
  tags:      ['production'],
  maxResponseTime: 5000,
  request: {
    url:    `${baseUrl}/login`,
    method: 'GET',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})
