'use server'

// src/lib/actions/auth.ts
// =============================================================================
// LUSTRE — Auth Server Actions
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit, loginRateLimit, signupRateLimit } from '@/lib/ratelimit'
import { captureServerEvent } from '@/lib/posthog'
import { sendTrialEmail } from '@/lib/email'

// -----------------------------------------------------------------------------
// Sign In
// -----------------------------------------------------------------------------

export type SignInState = { error?: string }

export async function signIn(
  prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email?.trim()) return { error: 'Please enter your email.' }
  if (!password)      return { error: 'Please enter your password.' }

  const ip = ((await headers()).get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const { success } = await checkRateLimit(loginRateLimit, ip)
  if (!success) return { error: 'Too many login attempts. Please wait 15 minutes and try again.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Invalid email or password.' }

  await captureServerEvent({ distinctId: data.user.id, event: 'user_signed_in' })

  redirect('/dashboard')
}

// -----------------------------------------------------------------------------
// Sign Up
// Creates a Supabase auth user. The database trigger handle_new_user()
// automatically creates the organisation and profile rows.
// -----------------------------------------------------------------------------

export type SignUpState = {
  error?: string
  success?: boolean
  requiresEmailConfirmation?: boolean
}

export async function signUp(
  prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const fullName         = formData.get('full_name') as string
  const organisationName = formData.get('organisation_name') as string
  const email            = formData.get('email') as string
  const password         = formData.get('password') as string
  // Optional: passed when signing up via an invite link
  const redirectTo       = formData.get('redirect') as string | null

  const isInviteSignup = redirectTo?.startsWith('/invite/')

  // Basic validation
  if (!fullName?.trim())  return { error: 'Please enter your name.' }
  if (!isInviteSignup && !organisationName?.trim())
    return { error: 'Please enter your business name.' }
  if (!email?.trim())     return { error: 'Please enter your email address.' }
  if (!password || password.length < 8)
    return { error: 'Password must be at least 8 characters.' }

  const ip = ((await headers()).get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const { success } = await checkRateLimit(signupRateLimit, ip)
  if (!success) return { error: 'Too many sign up attempts. Please try again later.' }

  const supabase = await createClient()

  // For invite sign-ups there's no business name — use full name as a placeholder.
  // The handle_new_user() trigger creates a temporary org which accept_invitation() cleans up.
  const orgName = isInviteSignup
    ? (fullName.trim() + "'s workspace")
    : organisationName.trim()

  const postConfirmUrl = redirectTo
    ? `${process.env.NEXT_PUBLIC_APP_URL}${redirectTo}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name:         fullName.trim(),
        organisation_name: orgName,
      },
      emailRedirectTo: postConfirmUrl,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists. Try logging in.' }
    }
    return { error: 'Sign up failed. Please check your details and try again.' }
  }

  if (data.user) {
    await captureServerEvent({
      distinctId: data.user.id,
      event:      'user_signed_up',
      properties: { requires_email_confirmation: !data.session, via_invite: !!isInviteSignup },
    })
  }

  if (!data.session) {
    return { success: true, requiresEmailConfirmation: true }
  }

  // Session exists — go to invite page or onboarding
  redirect(redirectTo ?? '/onboarding')
}

// -----------------------------------------------------------------------------
// Sign Up As Invitee
// Dedicated signup for team members arriving via an invitation link.
// Email comes from the invite token (server-side lookup), not from the form,
// so the user can't mistype it and the form is simpler.
// -----------------------------------------------------------------------------

export type InviteeSignUpState = {
  error?: string
  requiresEmailConfirmation?: boolean
}

export async function signUpAsInvitee(
  prevState: InviteeSignUpState,
  formData: FormData
): Promise<InviteeSignUpState> {
  const token    = formData.get('token') as string
  const fullName = (formData.get('full_name') as string)?.trim()
  const password = formData.get('password') as string

  if (!token)                        return { error: 'Invalid invitation link.' }
  if (!fullName)                     return { error: 'Please enter your name.' }
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const ip = ((await headers()).get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const { success } = await checkRateLimit(signupRateLimit, ip)
  if (!success) return { error: 'Too many sign up attempts. Please try again later.' }

  const supabase = await createClient()

  // Resolve the invite email server-side — don't trust anything from the form
  const { data: invitation } = await supabase.rpc('public_get_invitation_by_token', { p_token: token })
  if (!invitation) return { error: 'This invitation link is invalid or has expired.' }
  if (invitation.accepted_at) return { error: 'This invitation has already been accepted.' }
  if (new Date(invitation.expires_at) < new Date()) return { error: 'This invitation has expired. Please ask your admin to resend it.' }

  const email = invitation.email as string
  const orgName = fullName + "'s workspace" // temporary org, cleaned up by accept_invitation()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, organisation_name: orgName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}/accept`,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists. Try logging in instead.' }
    }
    return { error: 'Sign up failed. Please try again.' }
  }

  if (data.user) {
    await captureServerEvent({
      distinctId: data.user.id,
      event:      'user_signed_up',
      properties: { via_invite: true, requires_email_confirmation: !data.session },
    })
  }

  if (!data.session) {
    return { requiresEmailConfirmation: true }
  }

  redirect(`/invite/${token}`)
}

// -----------------------------------------------------------------------------
// Request Password Reset
// Sends a reset link to the given email via Supabase.
// Always returns success to avoid leaking whether the email is registered.
// -----------------------------------------------------------------------------

export type RequestPasswordResetState = { error?: string; success?: boolean }

export async function requestPasswordReset(
  prevState: RequestPasswordResetState,
  formData: FormData
): Promise<RequestPasswordResetState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) return { error: 'Please enter your email address.' }
  if (!email.includes('@')) return { error: 'Please enter a valid email address.' }

  const ip = ((await headers()).get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const { success } = await checkRateLimit(loginRateLimit, ip)
  if (!success) return { error: 'Too many requests. Please wait 15 minutes and try again.' }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  // Always succeed — don't reveal whether the email is registered
  return { success: true }
}

// -----------------------------------------------------------------------------
// Update Password
// Called from /reset-password after the user has landed via the reset link.
// The user must already have an active session (exchanged from the reset token
// by /auth/callback).
// -----------------------------------------------------------------------------

export type UpdatePasswordState = { error?: string; success?: boolean }

export async function updatePassword(
  prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string

  if (!password || password.length < 8)
    return { error: 'Password must be at least 8 characters.' }
  if (password !== confirm)
    return { error: 'Passwords do not match.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'Failed to update password. Your reset link may have expired.' }

  redirect('/dashboard')
}

// -----------------------------------------------------------------------------
// Update Email
// Triggers a confirmation email to the new address via Supabase.
// Also updates profiles.email immediately so invite/member checks stay in sync.
// -----------------------------------------------------------------------------

export type UpdateEmailState = { error?: string; success?: boolean }

export async function updateEmail(
  prevState: UpdateEmailState,
  formData: FormData
): Promise<UpdateEmailState> {
  const newEmail = (formData.get('email') as string)?.trim().toLowerCase()

  if (!newEmail) return { error: 'Please enter an email address.' }
  if (!newEmail.includes('@')) return { error: 'Please enter a valid email address.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (newEmail === user.email?.toLowerCase()) {
    return { error: 'That\'s already your current email address.' }
  }

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings` }
  )

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: 'Failed to update email. Please try again.' }
  }

  // Do NOT update profiles.email here — auth.users.email only changes after the
  // user clicks the confirmation link. profiles.email is synced lazily on the
  // next settings page load once the confirmed email differs from the stored one.

  return { success: true }
}

// -----------------------------------------------------------------------------
// Update User Name
// Updates profiles.full_name and keeps auth user metadata in sync.
// -----------------------------------------------------------------------------

export type UpdateNameState = { error?: string; success?: boolean }

export async function updateUserName(
  prevState: UpdateNameState,
  formData: FormData
): Promise<UpdateNameState> {
  const newName = (formData.get('full_name') as string)?.trim()
  if (!newName) return { error: 'Please enter your name.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: newName })
    .eq('id', user.id)

  if (profileError) return { error: 'Failed to update name. Please try again.' }

  // Keep auth metadata in sync (used by handle_new_user and analytics)
  await supabase.auth.updateUser({ data: { full_name: newName } })

  return { success: true }
}

// -----------------------------------------------------------------------------
// Update Onboarding Step
// Called by each step of the onboarding wizard on completion.
// -----------------------------------------------------------------------------

export async function advanceOnboardingStep(step: number): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isComplete = step >= 4

  await supabase
    .from('organisations')
    .update({
      onboarding_step: step,
      ...(isComplete ? { onboarding_completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', profile.organisation_id)

  if (isComplete) {
    await captureServerEvent({ distinctId: user.id, event: 'onboarding_completed' })

    // Send Day 1 trial nurture email — fire-and-forget, don't block the redirect
    const { data: org } = await supabase
      .from('organisations')
      .select('name, trial_ends_at')
      .eq('id', profile.organisation_id)
      .single()

    if (org?.trial_ends_at) {
      // Record the send first (idempotent), then send the email
      await supabase.rpc('record_trial_email_sent', {
        p_org_id:    profile.organisation_id,
        p_email_key: 'day1',
      })
      sendTrialEmail({
        to:         user.email!,
        orgName:    org.name,
        key:        'day1',
        upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      }).catch((err) => console.error('Trial day1 email failed:', err))
    }

    redirect('/dashboard')
  } else {
    redirect(`/onboarding?step=${step + 1}`)
  }
}

// -----------------------------------------------------------------------------
// Save Business Profile (Onboarding Step 1)
// -----------------------------------------------------------------------------

export type BusinessProfileState = {
  error?: string
}

export async function saveBusinessProfile(
  prevState: BusinessProfileState,
  formData: FormData
): Promise<BusinessProfileState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { error } = await supabase
    .from('organisations')
    .update({
      phone:        formData.get('phone') as string || null,
      website:      formData.get('website') as string || null,
      address_line1: formData.get('address_line1') as string || null,
      address_line2: formData.get('address_line2') as string || null,
      town:         formData.get('town') as string || null,
      postcode:     formData.get('postcode') as string || null,
      onboarding_step: 1,
    })
    .eq('id', profile.organisation_id)

  if (error) return { error: 'Failed to save. Please try again.' }

  redirect('/onboarding?step=2')
}

// -----------------------------------------------------------------------------
// Save Service Config (Onboarding Step 2)
// For now this just advances the step — service types already exist on jobs.
// In future this could store org-level service config/pricing defaults.
// -----------------------------------------------------------------------------

export async function saveServiceConfig(
  _prevState: BusinessProfileState,
  _formData: FormData
): Promise<BusinessProfileState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  await supabase
    .from('organisations')
    .update({ onboarding_step: 2 })
    .eq('id', profile.organisation_id)

  redirect('/onboarding?step=3')
}