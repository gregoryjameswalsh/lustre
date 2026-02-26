'use server'

// src/lib/actions/auth.ts
// =============================================================================
// LUSTRE — Auth Server Actions
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
  const fullName        = formData.get('full_name') as string
  const organisationName = formData.get('organisation_name') as string
  const email           = formData.get('email') as string
  const password        = formData.get('password') as string

  // Basic validation
  if (!fullName?.trim())           return { error: 'Please enter your name.' }
  if (!organisationName?.trim())   return { error: 'Please enter your business name.' }
  if (!email?.trim())              return { error: 'Please enter your email address.' }
  if (!password || password.length < 8)
    return { error: 'Password must be at least 8 characters.' }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This metadata is read by the handle_new_user() trigger
      data: {
        full_name:         fullName.trim(),
        organisation_name: organisationName.trim(),
      },
      // After email confirmation, send them to onboarding
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    },
  })

  if (error) {
    // Surface friendly messages for common errors
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists. Try logging in.' }
    }
    return { error: error.message }
  }

  // Supabase returns a session immediately if email confirmation is disabled.
  // If enabled, data.session is null and we show a "check your email" message.
  if (!data.session) {
    return { success: true, requiresEmailConfirmation: true }
  }

  // Session exists — go straight to onboarding
  redirect('/onboarding')
}

// -----------------------------------------------------------------------------
// Update Onboarding Step
// Called by each step of the onboarding wizard on completion.
// -----------------------------------------------------------------------------

export async function advanceOnboardingStep(step: number): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get their org
  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isComplete = step >= 4 // Step 4 is the last required step

  await supabase
    .from('organisations')
    .update({
      onboarding_step: step,
      ...(isComplete ? { onboarding_completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', profile.organisation_id)

  if (isComplete) {
    redirect('/dashboard')
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

  await supabase
    .from('organisations')
    .update({ onboarding_step: 2 })
    .eq('id', profile.organisation_id)

  redirect('/onboarding?step=3')
}