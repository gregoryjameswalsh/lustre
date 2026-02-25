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

// Joined types
export interface JobWithRelations extends Job {
  clients?: Pick<Client, 'first_name' | 'last_name'>
  properties?: Pick<Property, 'address_line1' | 'town'>
}