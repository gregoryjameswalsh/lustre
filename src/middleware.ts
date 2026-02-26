// src/middleware.ts
// =============================================================================
// LUSTRE — Middleware
// Handles three concerns in order:
//   1. Authentication — redirect unauthenticated users to /login
//   2. Onboarding gate — redirect incomplete users to /onboarding
//   3. Subscription gate — redirect lapsed accounts to /billing
// =============================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup', '/auth', '/terms', '/privacy']

// Routes that authenticated users can access even mid-onboarding
const ONBOARDING_ALLOWED = ['/onboarding', '/auth/signout']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through without any checks
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Build a mutable response so Supabase SSR can set cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ─── 1. Auth check ─────────────────────────────────────────────────────────

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ─── 2. Onboarding gate ────────────────────────────────────────────────────

  // If they're already heading to onboarding or signing out, let them through
  if (ONBOARDING_ALLOWED.some((route) => pathname.startsWith(route))) {
    return response
  }

  // Fetch their org's onboarding status
  // We join through profiles to get org data in one query
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      organisation_id,
      organisations (
        onboarding_completed_at,
        subscription_status,
        trial_ends_at,
        plan
      )
    `)
    .eq('id', user.id)
    .single()

  // Something is wrong with their account — log them out rather than loop
  if (!profile) {
    const signoutUrl = request.nextUrl.clone()
    signoutUrl.pathname = '/auth/signout'
    return NextResponse.redirect(signoutUrl)
  }

  const org = profile.organisations as {
    onboarding_completed_at: string | null
    subscription_status: string
    trial_ends_at: string | null
    plan: string
  } | null

  // Onboarding not complete — redirect to wizard
  if (org && !org.onboarding_completed_at) {
    const onboardingUrl = request.nextUrl.clone()
    onboardingUrl.pathname = '/onboarding'
    return NextResponse.redirect(onboardingUrl)
  }

  // ─── 3. Subscription gate ──────────────────────────────────────────────────
  // Only block on /dashboard routes — allow /billing and /settings through

  if (pathname.startsWith('/dashboard') && org) {
    const trialExpired =
      org.trial_ends_at && new Date(org.trial_ends_at) < new Date()
    const subscriptionLapsed =
      org.subscription_status === 'cancelled' ||
      org.subscription_status === 'past_due'

    // Free plan + trial expired = redirect to billing
    if (org.plan === 'free' && trialExpired) {
      const billingUrl = request.nextUrl.clone()
      billingUrl.pathname = '/billing'
      return NextResponse.redirect(billingUrl)
    }

    // Active subscription that has lapsed
    if (subscriptionLapsed) {
      const billingUrl = request.nextUrl.clone()
      billingUrl.pathname = '/billing'
      return NextResponse.redirect(billingUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - Public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}