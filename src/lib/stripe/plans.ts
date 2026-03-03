// src/lib/stripe/plans.ts
// =============================================================================
// LUSTRE — Stripe plan definitions
//
// Prices (in pence, GBP):
//   Starter:       £49/mo monthly  |  £39/mo annual  (£468/yr upfront)
//   Professional:  £149/mo monthly | £119/mo annual  (£1,428/yr upfront)
//   Business:      £399/mo monthly | £319/mo annual  (£3,828/yr upfront)
//   Enterprise:    Custom — not available via self-serve checkout
//
// Stripe Price IDs are stored in environment variables so they can differ
// between test and production environments.
//
// Required environment variables:
//   STRIPE_PRICE_STARTER_MONTHLY
//   STRIPE_PRICE_STARTER_ANNUAL
//   STRIPE_PRICE_PROFESSIONAL_MONTHLY
//   STRIPE_PRICE_PROFESSIONAL_ANNUAL
//   STRIPE_PRICE_BUSINESS_MONTHLY
//   STRIPE_PRICE_BUSINESS_ANNUAL
// =============================================================================

import type { Plan } from '@/lib/types'

export type BillingInterval = 'monthly' | 'annual'

export interface PlanConfig {
  key: Plan
  name: string
  tagline: string
  monthlyPricePence: number      // displayed price per month when billed monthly
  annualPricePence: number       // displayed price per month when billed annually
  annualTotalPence: number       // total charged upfront for annual plan
  seats: number                  // included seats (-1 = unlimited)
  monthlyPriceId: string | null  // Stripe Price ID — null for enterprise
  annualPriceId: string | null
  features: string[]
  highlighted?: boolean          // show as "Most popular"
}

export const PLANS: Record<Exclude<Plan, 'free' | 'enterprise'>, PlanConfig> = {
  starter: {
    key: 'starter',
    name: 'Starter',
    tagline: 'For solo operators and small teams',
    monthlyPricePence: 4900,
    annualPricePence:  3900,
    annualTotalPence:  46800,
    seats: 3,
    monthlyPriceId: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
    annualPriceId:  process.env.STRIPE_PRICE_STARTER_ANNUAL  ?? null,
    features: [
      'Up to 3 users',
      'Unlimited clients & properties',
      'Quotes with PDF sharing',
      'Job scheduling',
      'Activity timeline',
      'Email support',
    ],
  },

  professional: {
    key: 'professional',
    name: 'Professional',
    tagline: 'For growing teams who need more power',
    monthlyPricePence: 14900,
    annualPricePence:  11900,
    annualTotalPence:  142800,
    seats: 15,
    monthlyPriceId: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ?? null,
    annualPriceId:  process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL  ?? null,
    highlighted: true,
    features: [
      'Up to 15 users',
      'Everything in Starter',
      'Custom fields & tags',
      'Unlimited quotes',
      'Advanced filters & saved views',
      'Priority support',
    ],
  },

  business: {
    key: 'business',
    name: 'Business',
    tagline: 'For multi-team operations at scale',
    monthlyPricePence: 39900,
    annualPricePence:  31900,
    annualTotalPence:  382800,
    seats: 50,
    monthlyPriceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? null,
    annualPriceId:  process.env.STRIPE_PRICE_BUSINESS_ANNUAL  ?? null,
    features: [
      'Up to 50 users',
      'Everything in Professional',
      'RBAC (4 permission roles)',
      'API access',
      'Email sync',
      'Custom reports',
      'Dedicated support',
    ],
  },
}

// Map a Stripe Price ID back to a plan key — used in webhook handlers.
export function planFromPriceId(priceId: string): Plan | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyPriceId === priceId || plan.annualPriceId === priceId) {
      return plan.key
    }
  }
  return null
}

export function formatPlanPrice(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
  }).format(pence / 100)
}
