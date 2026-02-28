// src/lib/types/index.ts
// =============================================================================
// LUSTRE — Core Types
// =============================================================================

// -----------------------------------------------------------------------------
// Organisation (Tenant)
// -----------------------------------------------------------------------------

export type Plan = 'free' | 'starter' | 'pro'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled'

export interface Organisation {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null         // legacy — kept for Walsh Standard compat
  address_line1: string | null
  address_line2: string | null
  town: string | null
  postcode: string | null
  website: string | null
  logo_url: string | null
  slug: string
  plan: Plan
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  onboarding_step: number
  onboarding_completed_at: string | null
  trial_ends_at: string | null
  created_at: string
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5

// -----------------------------------------------------------------------------
// Profile (User within an org)
// -----------------------------------------------------------------------------

export type UserRole = 'admin' | 'team_member'

export interface Profile {
  id: string
  organisation_id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
}

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

export type ClientStatus = 'active' | 'inactive' | 'lead'

export interface Client {
  id: string
  organisation_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  secondary_phone: string | null
  notes: string | null
  status: ClientStatus
  source: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Property
// -----------------------------------------------------------------------------

export interface Property {
  id: string
  organisation_id: string
  client_id: string
  address_line1: string
  address_line2: string | null
  town: string
  postcode: string
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  access_instructions: string | null
  parking_instructions: string | null
  alarm_instructions: string | null
  key_held: boolean | null
  specialist_surfaces: string | null
  pets: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Job
// -----------------------------------------------------------------------------

export type ServiceType = 'regular' | 'deep_clean' | 'move_in' | 'move_out' | 'post_event' | 'other'
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Job {
  id: string
  organisation_id: string
  client_id: string
  property_id: string | null
  assigned_to: string | null
  service_type: ServiceType
  status: JobStatus
  scheduled_date: string
  scheduled_time: string | null
  duration_hours: number | null
  price: number | null
  notes: string | null
  internal_notes: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Activity
// -----------------------------------------------------------------------------

export type ActivityType =
  | 'note' | 'call' | 'email'
  | 'quote_sent' | 'quote_viewed' | 'quote_accepted' | 'quote_declined'
  | 'job_scheduled' | 'job_completed' | 'job_cancelled'
  | 'follow_up' | 'review_requested' | 'complaint' | 'other'

export interface Activity {
  id: string
  organisation_id: string
  client_id: string
  job_id: string | null
  created_by: string
  type: ActivityType
  title: string | null
  body: string | null
  metadata: Record<string, unknown> | null  // ← changed from unknown
  pinned: boolean
  created_at: string
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
}

// -----------------------------------------------------------------------------
// Follow-up
// -----------------------------------------------------------------------------

export type FollowUpPriority = 'low' | 'normal' | 'high' | 'urgent'
export type FollowUpStatus = 'open' | 'done' | 'dismissed'

export interface FollowUp {
  id: string
  organisation_id: string
  client_id: string
  activity_id: string | null
  created_by: string
  assigned_to: string | null
  title: string
  notes: string | null
  due_date: string | null
  priority: FollowUpPriority
  status: FollowUpStatus
  created_at: string
}

// -----------------------------------------------------------------------------
// Onboarding
// -----------------------------------------------------------------------------

export interface OnboardingBusinessProfileData {
  name: string
  phone: string
  website: string
  address_line1: string
  address_line2: string
  town: string
  postcode: string
}

export interface OnboardingServiceData {
  service_types: ServiceType[]
}

// -----------------------------------------------------------------------------
// Joined / relational types
// -----------------------------------------------------------------------------

export interface JobWithRelations extends Job {
  clients?: {
    first_name: string | null
    last_name: string | null
  } | null
  properties?: {
    address_line1: string | null
    town: string | null
    postcode: string | null
  } | null
}