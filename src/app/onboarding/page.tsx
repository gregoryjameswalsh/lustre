// src/app/onboarding/page.tsx
// =============================================================================
// LUSTRE — Onboarding Wizard
// Single page, step driven by ?step= query param.
// Each step is a server component that loads the right client step form.
// The org's onboarding_step column tracks progress so they can resume.
// =============================================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StepBusinessProfile from './_steps/StepBusinessProfile'
import StepServices from './_steps/StepServices'
import StepTeam from './_steps/StepTeam'
import StepFirstClient from './_steps/StepFirstClient'

// Step metadata
const STEPS = [
  { number: 1, label: 'Business profile' },
  { number: 2, label: 'Services'         },
  { number: 3, label: 'Your team'        },
  { number: 4, label: 'First client'     },
]

// -----------------------------------------------------------------------------
// Progress bar component
// -----------------------------------------------------------------------------

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-10">
      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isComplete = current > step.number
          const isCurrent  = current === step.number

          return (
            <div key={step.number} className="flex flex-1 flex-col items-center">
              {/* Connector line before (except first) */}
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div className={`h-px flex-1 transition-colors ${isComplete || isCurrent ? 'bg-[#4a5c4e]' : 'bg-zinc-200'}`} />
                )}

                {/* Circle */}
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    isComplete
                      ? 'bg-[#4a5c4e] text-white'
                      : isCurrent
                      ? 'border-2 border-[#4a5c4e] bg-white text-[#4a5c4e]'
                      : 'border border-zinc-200 bg-white text-zinc-400'
                  }`}
                >
                  {isComplete ? (
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M3.72 9.53L1.22 7.03a.75.75 0 011.06-1.06l2 2L9.72 3.03a.75.75 0 111.06 1.06L4.78 9.53a.75.75 0 01-1.06 0z" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>

                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 transition-colors ${isComplete ? 'bg-[#4a5c4e]' : 'bg-zinc-200'}`} />
                )}
              </div>

              {/* Label */}
              <span className={`mt-2 text-center text-xs ${isCurrent ? 'font-medium text-[#4a5c4e]' : 'text-zinc-400'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Page — server component
// -----------------------------------------------------------------------------


export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch org data to know where they are in onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: org } = await supabase
    .from('organisations')
    .select('id, name, onboarding_step, onboarding_completed_at, phone, website, address_line1, address_line2, town, postcode')
    .eq('id', profile.organisation_id)
    .single()

  if (!org) redirect('/login')

  // If they've already completed onboarding, send them to dashboard
  if (org.onboarding_completed_at) redirect('/dashboard')

  // Determine which step to show
  // URL param takes precedence but can't go backwards past completed steps
  const resolvedParams = await (searchParams as unknown as Promise<{ step?: string }>)
  const requestedStep = parseInt(resolvedParams.step ?? '1', 10)
  const currentStep = (Math.min(Math.max(requestedStep, 1), 4)) as 1 | 2 | 3 | 4

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
        <span className="font-['Urbanist'] text-lg font-light tracking-widest text-[#0c0c0b]">
          LUSTRE
        </span>
        <span className="text-xs text-zinc-400">Setting up {org.name}</span>
      </header>

      <main className="mx-auto max-w-xl px-6 py-12">
        <ProgressBar current={currentStep} />

        {/* Step content */}
        {currentStep === 1 && <StepBusinessProfile org={org} />}
        {currentStep === 2 && <StepServices />}
        {currentStep === 3 && <StepTeam organisationId={org.id} />}
        {currentStep === 4 && <StepFirstClient organisationId={org.id} />}
      </main>
    </div>
  )
}