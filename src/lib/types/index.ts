// src/lib/types/index.ts
// =============================================================================
// LUSTRE — Core Types
// =============================================================================

// -----------------------------------------------------------------------------
// RBAC — Permissions & Roles
// -----------------------------------------------------------------------------

export const PERMISSIONS = {
  // Clients
  'clients:read':              'View clients',
  'clients:write':             'Create & edit clients',
  'clients:delete':            'Delete clients',
  // Jobs
  'jobs:read':                 'View jobs',
  'jobs:write':                'Create & edit jobs',
  'jobs:delete':               'Delete jobs',
  // Quotes
  'quotes:read':               'View quotes',
  'quotes:write':              'Create & edit quotes',
  'quotes:delete':             'Delete quotes',
  // Pipeline
  'pipeline:read':             'View pipeline',
  'pipeline:write':            'Move & manage leads in the pipeline',
  'pipeline:delete':           'Remove leads from the pipeline',
  // Reports
  'reports:read':              'View reports & analytics',
  // Settings
  'settings:read':             'View settings',
  'settings:write':            'Edit general settings',
  'settings:manage_team':      'Manage team members',
  'settings:manage_roles':     'Manage roles & permissions',
  'settings:manage_billing':   'Manage billing',
  // GDPR
  'gdpr:export':               'Export client data (DSAR)',
  'gdpr:erase':                'Erase client data',
} as const

export type Permission = keyof typeof PERMISSIONS

export interface Role {
  id:              string
  organisation_id: string
  name:            string
  description:     string | null
  is_system:       boolean
  created_at:      string
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

// -----------------------------------------------------------------------------
// Pipeline
// -----------------------------------------------------------------------------

export interface PipelineStage {
  id:              string
  organisation_id: string
  name:            string
  position:        number
  colour:          string | null
  is_won:          boolean
  is_lost:         boolean
  created_at:      string
}

// -----------------------------------------------------------------------------
// Organisation (Tenant)
// -----------------------------------------------------------------------------

export type Plan = 'free' | 'starter' | 'professional' | 'business' | 'enterprise'
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
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  onboarding_step: number
  onboarding_completed_at: string | null
  trial_ends_at: string | null
  created_at: string
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5

// -----------------------------------------------------------------------------
// Invitation
// -----------------------------------------------------------------------------

export interface Invitation {
  id:              string
  organisation_id: string
  email:           string
  role:            UserRole
  token:           string
  invited_by:      string | null
  accepted_at:     string | null
  expires_at:      string
  created_at:      string
}

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
  // Pipeline fields (null when client is not in / no longer in the pipeline)
  pipeline_stage_id:       string | null
  pipeline_assigned_to:    string | null
  estimated_monthly_value: number | null
  pipeline_notes:          string | null
  pipeline_entered_at:     string | null
  won_at:                  string | null
  lost_at:                 string | null
  lost_reason:             string | null
}

/** Client enriched with joined pipeline stage + assigned team member — used by the Kanban board. */
export interface ClientInPipeline extends Client {
  pipeline_stages?: { name: string; colour: string | null; is_won: boolean; is_lost: boolean } | null
  pipeline_assigned_profile?: { full_name: string | null } | null
  /** Tags joined via entity_tags → tags. Present only when the pipeline query includes the join. */
  tags?: { id: string; colour: string | null; name: string }[]
}

// -----------------------------------------------------------------------------
// Property
// -----------------------------------------------------------------------------

export interface PropertyPhoto {
  id:               string
  organisation_id:  string
  property_id:      string
  storage_path:     string
  file_name:        string
  file_size_bytes:  number | null
  mime_type:        string | null
  caption:          string | null
  display_order:    number
  is_main:          boolean
  uploaded_by:      string | null
  uploaded_at:      string
}

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
// Job Type (dynamic, per-org — replaces hardcoded ServiceType enum)
// -----------------------------------------------------------------------------

export interface JobType {
  id: string
  organisation_id: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Retained for shadow-column period (service_type still exists on jobs in DB).
// Remove once the shadow column is dropped in a future migration.
export type ServiceType = 'regular' | 'deep_clean' | 'move_in' | 'move_out' | 'post_event' | 'other'

// -----------------------------------------------------------------------------
// Checklist Templates
// -----------------------------------------------------------------------------

export interface ChecklistTemplate {
  id: string
  organisation_id: string
  name: string
  description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistTemplateItem {
  id: string
  organisation_id: string
  template_id: string
  title: string
  guidance: string | null
  sort_order: number
  created_at: string
}

export interface ChecklistTemplateWithRelations extends ChecklistTemplate {
  checklist_template_items: ChecklistTemplateItem[]
  checklist_template_job_types: { job_type_id: string; job_types: { id: string; name: string } }[]
}

// -----------------------------------------------------------------------------
// Job Checklist (instantiated from a template when a job starts)
// -----------------------------------------------------------------------------

export interface JobChecklist {
  id: string
  organisation_id: string
  job_id: string
  template_id: string | null
  template_name: string
  created_at: string
}

export interface JobChecklistPhoto {
  id: string
  organisation_id: string
  job_checklist_item_id: string
  storage_path: string
  file_name: string
  file_size_bytes: number | null
  mime_type: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface JobChecklistItem {
  id: string
  organisation_id: string
  job_checklist_id: string
  template_item_id: string | null
  title: string
  guidance: string | null
  sort_order: number
  is_completed: boolean
  completed_by: string | null
  completed_at: string | null
  completed_by_profile?: { full_name: string | null } | null
  photos?: JobChecklistPhoto[]
  created_at: string
}

export interface JobChecklistWithItems extends JobChecklist {
  items: JobChecklistItem[]
}

// -----------------------------------------------------------------------------
// Job
// -----------------------------------------------------------------------------

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface Job {
  id: string
  organisation_id: string
  client_id: string
  property_id: string | null
  assigned_to: string | null
  job_type_id: string
  service_type: ServiceType  // shadow column — kept for transition period
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
  | 'pipeline_stage_changed' | 'pipeline_won' | 'pipeline_lost'

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
// GDPR
// -----------------------------------------------------------------------------

export type ConsentType       = 'marketing_email' | 'sms' | 'data_processing'
export type GdprRequestType   = 'dsar' | 'erasure' | 'rectification'
export type GdprRequestStatus = 'pending' | 'in_progress' | 'completed'

export interface ConsentRecord {
  id:              string
  organisation_id: string
  client_id:       string
  consent_type:    ConsentType
  granted:         boolean
  granted_at:      string | null
  withdrawn_at:    string | null
  source:          'manual' | 'import' | 'form' | null
  created_at:      string
}

export interface GdprRequest {
  id:              string
  organisation_id: string
  client_id:       string | null
  request_type:    GdprRequestType
  status:          GdprRequestStatus
  requested_at:    string
  completed_at:    string | null
  notes:           string | null
  export_url:      string | null
}

export interface GdprRequestWithClient extends GdprRequest {
  clients?: { first_name: string; last_name: string } | null
}

// -----------------------------------------------------------------------------
// Tags & Segmentation (M03)
// -----------------------------------------------------------------------------

/** Curated colour palette for tags. Palette is enforced in the UI only; hex is stored as-is. */
export const CURATED_TAG_COLOURS = [
  { name: 'Frost Mint',     hex: '#C8F5D7' },
  { name: 'Sky Blue',       hex: '#C8E6FF' },
  { name: 'Soft Lavender',  hex: '#E0D5FF' },
  { name: 'Warm Peach',     hex: '#FFE0CC' },
  { name: 'Blush Rose',     hex: '#FFD5D5' },
  { name: 'Lemon Cream',    hex: '#FFF3C8' },
  { name: 'Cloud Grey',     hex: '#E2E8F0' },
  { name: 'Sage',           hex: '#D4EDD4' },
] as const

export const DEFAULT_TAG_COLOUR = '#E2E8F0' // Cloud Grey

export type TagEntityType = 'client' | 'job'

export interface Tag {
  id:              string
  organisation_id: string
  name:            string
  colour:          string | null
  created_at:      string
}

export interface TagWithUsage extends Tag {
  usage_count: number
}

export interface EntityTag {
  id:          string
  tag_id:      string
  entity_id:   string
  entity_type: TagEntityType
  tag?:        Tag
}

// -----------------------------------------------------------------------------
// Invoice
// -----------------------------------------------------------------------------

export type InvoiceStatus =
  | 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void' | 'credit_note'

export interface Invoice {
  id:                       string
  organisation_id:          string
  client_id:                string
  job_id:                   string | null
  quote_id:                 string | null
  invoice_number:           string
  view_token:               string
  status:                   InvoiceStatus
  issue_date:               string
  due_date:                 string
  subtotal:                 number
  tax_rate:                 number
  tax_amount:               number
  total:                    number
  amount_paid:              number
  currency:                 string
  stripe_payment_link_id:   string | null
  stripe_payment_link_url:  string | null
  stripe_payment_intent_id: string | null
  sent_at:                  string | null
  viewed_at:                string | null
  paid_at:                  string | null
  voided_at:                string | null
  void_reason:              string | null
  notes:                    string | null
  internal_notes:           string | null
  created_at:               string
  updated_at:               string
}

export interface InvoiceLineItem {
  id:              string
  invoice_id:      string
  organisation_id: string
  description:     string
  quantity:        number
  unit_price:      number
  amount:          number
  sort_order:      number
  created_at:      string
}

export interface InvoiceWithRelations extends Invoice {
  clients?: {
    first_name: string
    last_name:  string
    email:      string | null
    phone:      string | null
  } | null
  invoice_line_items?: InvoiceLineItem[]
}

// -----------------------------------------------------------------------------
// Client Portal
// -----------------------------------------------------------------------------

export type PortalStatus = 'not_invited' | 'invited' | 'active' | 'suspended'

export interface ClientPortalSettings {
  organisation_id:          string
  portal_enabled:           boolean
  portal_slug:              string | null
  show_team_member_name:    boolean
  show_job_pricing:         boolean
  share_completed_notes:    boolean
  instruction_cutoff_hours: number
  welcome_message:          string | null
  created_at:               string
  updated_at:               string
}

export interface ClientPortalInvitation {
  id:              string
  organisation_id: string
  client_id:       string
  email:           string
  token:           string
  expires_at:      string
  used_at:         string | null
  created_by:      string | null
  created_at:      string
}

/** Shape returned by portal_get_client_context() RPC */
export interface PortalClientContext {
  client_id:               string
  client_first_name:       string
  client_last_name:        string
  client_email:            string | null
  org_id:                  string
  org_name:                string
  org_brand_color:         string | null
  org_logo_url:            string | null
  show_team_member_name:   boolean
  show_job_pricing:        boolean
  share_completed_notes:   boolean
  instruction_cutoff_hours: number
  welcome_message:         string | null
}

/** Shape returned by portal_get_upcoming_jobs() / portal_get_job_history() */
export interface PortalJob {
  id:                    string
  status:                JobStatus
  scheduled_date:        string | null
  scheduled_time:        string | null
  duration_hours:        number | null
  completed_at:          string | null
  job_type_name:         string | null
  property_id:           string | null
  property_address:      string | null
  property_town:         string | null
  property_postcode:     string | null
  client_instruction:    string | null
  client_instruction_at: string | null
  instruction_cutoff_at: string | null
  assigned_name:         string | null
  price:                 number | null
  notes:                 string | null
}

// -----------------------------------------------------------------------------
// Booking Requests
// -----------------------------------------------------------------------------

export type BookingRequestStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'alternative_proposed'
  | 'client_accepted_alternative'
  | 'client_declined_alternative'
  | 'cancelled'

export type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'flexible'

/** Shape returned by portal_get_booking_requests() (list view) */
export interface PortalBookingRequest {
  id:               string
  status:           BookingRequestStatus
  requested_date:   string | null
  preferred_time:   PreferredTime | null
  notes:            string | null
  job_type_name:    string | null
  property_address: string | null
  property_town:    string | null
  proposed_date:    string | null
  proposed_time:    PreferredTime | null
  operator_notes:   string | null
  created_at:       string
}

/** Shape returned by portal_get_booking_request_detail() */
export interface PortalBookingRequestDetail extends PortalBookingRequest {
  job_type_id:       string | null
  property_id:       string | null
  property_address2: string | null
  property_postcode: string | null
  updated_at:        string
}

/** Operator-side booking request row (from normal Supabase query) */
export interface BookingRequest {
  id:               string
  organisation_id:  string
  client_id:        string
  property_id:      string | null
  job_type_id:      string | null
  requested_date:   string | null
  preferred_time:   PreferredTime | null
  notes:            string | null
  status:           BookingRequestStatus
  operator_notes:   string | null
  proposed_date:    string | null
  proposed_time:    PreferredTime | null
  actioned_by:      string | null
  actioned_at:      string | null
  created_at:       string
  updated_at:       string
}

export interface BookingRequestWithRelations extends BookingRequest {
  clients?:    { first_name: string; last_name: string; email: string | null } | null
  properties?: { address_line1: string; town: string | null } | null
  job_types?:  { name: string } | null
}

/** Shape returned by portal_get_properties() */
export interface PortalProperty {
  id:            string
  address_line1: string
  address_line2: string | null
  town:          string | null
  county:        string | null
  postcode:      string | null
  property_type: string | null
  bedrooms:      number | null
  bathrooms:     number | null
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
  job_types?: {
    name: string
  } | null
}