// src/lib/posthog.ts
// =============================================================================
// LUSTRE — PostHog server-side event capture
//
// Uses posthog-node to fire events from server actions.
// All events are flushed immediately — required in serverless environments
// (Vercel) where the execution context ends after the response is sent.
//
// Required env vars:
//   NEXT_PUBLIC_POSTHOG_KEY   — PostHog project API key (phc_...)
//   NEXT_PUBLIC_POSTHOG_HOST  — PostHog ingest host (https://eu.i.posthog.com)
// =============================================================================

import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getClient(): PostHog | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey) return null

  if (!_client) {
    _client = new PostHog(apiKey, {
      host:          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      flushAt:       1,   // flush after every event — safe for serverless
      flushInterval: 0,
    })
  }

  return _client
}

export async function captureServerEvent({
  distinctId,
  event,
  properties,
}: {
  distinctId: string
  event:      string
  properties?: Record<string, unknown>
}): Promise<void> {
  const client = getClient()
  if (!client) return

  client.capture({ distinctId, event, properties })
  await client.shutdown()
  _client = null  // reset so next call gets a fresh client
}
