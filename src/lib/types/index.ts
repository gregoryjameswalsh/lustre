export type UserRole = 'admin' | 'team_member'
export type ClientStatus = 'active' | 'inactive' | 'lead'
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type ServiceType = 'regular' | 'deep_clean' | 'move_in' | 'move_out' | 'post_event' | 'other'
export type PropertyType = 'house' | 'flat' | 'barn' | 'cottage' | 'other'

export interface Organisation {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  logo_url?: string
  created_at: string
}

export interface Profile {
  id: string
  organisation_id: string
  full_name?: string
  email?: string
  phone?: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Client {
  id: string
  organisation_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  secondary_phone?: string
  notes?: string
  status: ClientStatus
  source?: string
  created_at: string
}

export interface Property {
  id: string
  organisation_id: string
  client_id: string
  address_line1: string
  address_line2?: string
  town?: string
  postcode?: string
  property_type?: PropertyType
  bedrooms?: number
  bathrooms?: number
  access_instructions?: string
  parking_instructions?: string
  alarm_instructions?: string
  key_held: boolean
  specialist_surfaces?: string
  pets?: string
  created_at: string
}

export interface Job {
  id: string
  organisation_id: string
  client_id: string
  property_id: string
  assigned_to?: string
  service_type?: ServiceType
  status: JobStatus
  scheduled_date?: string
  scheduled_time?: string
  duration_hours?: number
  price?: number
  notes?: string
  internal_notes?: string
  created_at: string
}

export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'job_scheduled'
  | 'job_completed'
  | 'job_cancelled'
  | 'follow_up'
  | 'review_requested'
  | 'complaint'
  | 'other'

export type FollowUpPriority = 'low' | 'normal' | 'high' | 'urgent'
export type FollowUpStatus = 'open' | 'done' | 'dismissed'

export interface Activity {
  id: string
  organisation_id: string
  client_id: string
  job_id?: string
  created_by?: string
  type: ActivityType
  title?: string
  body?: string
  metadata: Record<string, any>
  pinned: boolean
  created_at: string
  profiles?: { full_name?: string; email?: string }
}

export interface FollowUp {
  id: string
  organisation_id: string
  client_id: string
  activity_id?: string
  created_by?: string
  assigned_to?: string
  title: string
  notes?: string
  due_date?: string
  priority: FollowUpPriority
  status: FollowUpStatus
  created_at: string
}

// Joined types
export interface JobWithRelations extends Job {
  clients?: Pick<Client, 'first_name' | 'last_name'>
  properties?: Pick<Property, 'address_line1' | 'town'>
}