// src/lib/queries/tags.ts
// =============================================================================
// LUSTRE — Tag queries (M03)
// =============================================================================

import { createClient }    from '@/lib/supabase/server'
import type { Tag, TagWithUsage, EntityTag, TagEntityType } from '@/lib/types'

async function getOrgId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organisation_id) throw new Error('No organisation found')
  return profile.organisation_id
}

/** All tags for the current org, alphabetically, with usage counts. */
export async function getTags(): Promise<TagWithUsage[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('tags')
    .select('*, entity_tags(id)')
    .eq('organisation_id', orgId)
    .order('name', { ascending: true })

  if (error) throw new Error('Failed to fetch tags.')

  return (data ?? []).map(tag => ({
    id:              tag.id,
    organisation_id: tag.organisation_id,
    name:            tag.name,
    colour:          tag.colour,
    created_at:      tag.created_at,
    usage_count:     Array.isArray(tag.entity_tags) ? tag.entity_tags.length : 0,
  }))
}

/** All tags applied to a specific entity. */
export async function getEntityTags(
  entityId:   string,
  entityType: TagEntityType
): Promise<Tag[]> {
  const supabase = await createClient()
  await getOrgId() // auth check

  const { data, error } = await supabase
    .from('entity_tags')
    .select('tags(id, organisation_id, name, colour, created_at)')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)

  if (error) throw new Error('Failed to fetch entity tags.')

  return (data ?? [])
    .map(row => row.tags as Tag | null)
    .filter((t): t is Tag => t !== null)
}

/** Tags not yet applied to a given entity — used to populate the add-tag dropdown. */
export async function getAvailableTagsForEntity(
  entityId:   string,
  entityType: TagEntityType
): Promise<Tag[]> {
  const supabase = await createClient()
  const orgId = await getOrgId()

  // Get already-applied tag IDs
  const { data: applied } = await supabase
    .from('entity_tags')
    .select('tag_id')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)

  const appliedIds = (applied ?? []).map(r => r.tag_id)

  const query = supabase
    .from('tags')
    .select('*')
    .eq('organisation_id', orgId)
    .order('name', { ascending: true })

  if (appliedIds.length > 0) {
    query.not('id', 'in', `(${appliedIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw new Error('Failed to fetch available tags.')
  return data ?? []
}

/** Number of entities a tag is applied to — used in delete confirmation. */
export async function getTagUsageCount(tagId: string): Promise<number> {
  const supabase = await createClient()
  await getOrgId() // auth check — RLS verifies org ownership via tag

  const { count, error } = await supabase
    .from('entity_tags')
    .select('id', { count: 'exact', head: true })
    .eq('tag_id', tagId)

  if (error) throw new Error('Failed to fetch tag usage count.')
  return count ?? 0
}
