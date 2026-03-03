// src/lib/stripe/index.ts
// =============================================================================
// LUSTRE — Stripe server-side client (singleton)
// Import this wherever you need the Stripe SDK on the server.
// Never import stripe on the client — use the API routes instead.
// =============================================================================

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})
