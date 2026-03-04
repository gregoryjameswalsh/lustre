// checkly.config.ts
// =============================================================================
// LUSTRE — Checkly Monitoring as Code
//
// Deploy checks:  npx checkly deploy
// Test locally:   npx checkly test
// View results:   https://app.checklyhq.com
//
// Required environment variables (set in Checkly dashboard + CI):
//   CHECKLY_API_KEY        — Checkly API key (User Settings → API Keys)
//   CHECKLY_ACCOUNT_ID     — Checkly account ID (User Settings)
//
// The ENVIRONMENT_URL variable is injected automatically by Checkly when
// running checks against a specific deployment (e.g. Vercel preview URLs).
// It falls back to the production URL if not set.
// =============================================================================

import { defineConfig } from '@checkly/cli'

export default defineConfig({
  projectName: 'Lustre',
  logicalId:   'lustre-production',
  repoUrl:     'https://github.com/gregoryjameswalsh/lustre',
  checks: {
    activated:  true,
    muted:      false,
    runtimeId:  '2024.09',
    frequency:  1,   // every 1 minute
    locations:  ['eu-west-1', 'eu-central-1'],
    tags:       ['production'],
    checkMatch: '**/__checks__/**/*.check.ts',
    alertChannels: [],
  },
})
