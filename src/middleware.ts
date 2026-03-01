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
const PUBLIC_ROUTES = ['/login', '/signup', '/auth', '/terms', '/privacy', '/q']

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
    // Only redirect to internal paths — prevent open redirect via crafted URLs
    const safeRedirect = pathname.startsWith('/') && !pathname.startsWith('//')
    loginUrl.searchParams.set('redirect', safeRedirect ? pathname : '/dashboard')
    return NextResponse.redirect(loginUrl)
  }

  // ─── 2. Onboarding gate ────────────────────────────────────────────────────

  // If they're already heading to onboarding or signing out, let them through
  if (ONBOARDING_ALLOWED.some((route) => pathname.startsWith(route))) {
    return response
  }

  // Two explicit queries — more reliable than nested join syntax
  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  // No profile means broken account — sign them out
  if (!profile) {
    const signoutUrl = request.nextUrl.clone()
    signoutUrl.pathname = '/auth/signout'
    return NextResponse.redirect(signoutUrl)
  }

  const { data: org } = await supabase
    .from('organisations')
    .select('onboarding_completed_at, subscription_status, trial_ends_at, plan')
    .eq('id', profile.organisation_id)
    .single()

  // No org or onboarding not complete — send to wizard
  if (!org || !org.onboarding_completed_at) {
    const onboardingUrl = request.nextUrl.clone()
    onboardingUrl.pathname = '/onboarding'
    return NextResponse.redirect(onboardingUrl)
  }

  // ─── 3. Subscription gate ──────────────────────────────────────────────────
  // Only block on /dashboard routes — /billing and /settings pass through

  if (pathname.startsWith('/dashboard')) {
    const trialExpired =
      org.trial_ends_at && new Date(org.trial_ends_at) < new Date()
    const subscriptionLapsed =
      org.subscription_status === 'cancelled' ||
      org.subscription_status === 'past_due'

    if (org.plan === 'free' && trialExpired) {
      const billingUrl = request.nextUrl.clone()
      billingUrl.pathname = '/billing'
      return NextResponse.redirect(billingUrl)
    }

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}