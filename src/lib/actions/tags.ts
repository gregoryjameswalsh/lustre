'use server'

// src/lib/actions/tags.ts
// =============================================================================
// LUSTRE — Tag server actions (M03)
//
// Tag management (create/update/delete) requires settings:write.
// Applying / removing tags requires clients:write or jobs:write.
// =============================================================================

import { revalidatePath }          from 'next/cache'
import { requirePermission, getOrgAndUser } from './_auth'
import type { TagEntityType }      from '@/lib/types'

const MAX_TAGS_PER_CLIENT = 10

// ---------------------------------------------------------------------------
// Tag definition management
// ---------------------------------------------------------------------------

export async function createTagAction(
  name:    string,
  colour:  string | null,
): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('settings:write')

  const trimmed = name.trim().slice(0, 50)
  if (!trimmed) return { error: 'Tag name is required.' }

  const { error } = await supabase
    .from('tags')
    .insert({ organisation_id: orgId, name: trimmed, colour: colour ?? null })

  if (error) {
    if (error.code === '23505') return { error: `A tag named "${trimmed}" already exists.` }
    return { error: 'Failed to create tag.' }
  }

  revalidatePath('/dashboard/settings/tags')
  return {}
}

export async function updateTagAction(
  tagId:  string,
  name:   string,
  colour: string | null,
): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('settings:write')

  const trimmed = name.trim().slice(0, 50)
  if (!trimmed) return { error: 'Tag name is required.' }

  const { error } = await supabase
    .from('tags')
    .update({ name: trimmed, colour: colour ?? null })
    .eq('id', tagId)
    .eq('organisation_id', orgId)

  if (error) {
    if (error.code === '23505') return { error: `A tag named "${trimmed}" already exists.` }
    return { error: 'Failed to update tag.' }
  }

  revalidatePath('/dashboard/settings/tags')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/pipeline')
  return {}
}

export async function deleteTagAction(tagId: string): Promise<{ error?: string }> {
  const { supabase, orgId } = await requirePermission('settings:write')

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete tag.' }

  revalidatePath('/dashboard/settings/tags')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/jobs')
  return {}
}

// ---------------------------------------------------------------------------
// Entity tag assignment
// ---------------------------------------------------------------------------

export async function addTagToEntityAction(
  tagId:      string,
  entityId:   string,
  entityType: TagEntityType,
): Promise<{ error?: string }> {
  // Permission guard: clients:write for clients, jobs:write for jobs
  const permission = entityType === 'client' ? 'clients:write' : 'jobs:write'
  const { supabase, orgId, userId } = await requirePermission(permission)

  // Verify the tag belongs to this org
  const { data: tag } = await supabase
    .from('tags')
    .select('id, name')
    .eq('id', tagId)
    .eq('organisation_id', orgId)
    .single()

  if (!tag) return { error: 'Tag not found.' }

  // Enforce max 10 tags per client
  if (entityType === 'client') {
    const { count } = await supabase
      .from('entity_tags')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('entity_type', 'client')

    if ((count ?? 0) >= MAX_TAGS_PER_CLIENT) {
      return { error: `Maximum of ${MAX_TAGS_PER_CLIENT} tags per client reached. Remove a tag to add another.` }
    }
  }

  const { error } = await supabase
    .from('entity_tags')
    .insert({ tag_id: tagId, entity_id: entityId, entity_type: entityType })

  if (error) {
    if (error.code === '23505') return {} // already applied — treat as success
    return { error: 'Failed to add tag.' }
  }

  // Activity log for client tag additions (point-in-time name snapshot)
  if (entityType === 'client') {
    await supabase.from('activities').insert({
      organisation_id: orgId,
      client_id:       entityId,
      created_by:      userId,
      type:            'note',
      title:           `Tag added: ${tag.name}`,
      pinned:          false,
    })
  }

  revalidatePath(`/dashboard/clients/${entityId}`)
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/pipeline')
  if (entityType === 'job') revalidatePath(`/dashboard/jobs/${entityId}`)
  return {}
}

export async function removeTagFromEntityAction(
  tagId:      string,
  entityId:   string,
  entityType: TagEntityType,
): Promise<{ error?: string }> {
  const permission = entityType === 'client' ? 'clients:write' : 'jobs:write'
  const { supabase, orgId, userId } = await requirePermission(permission)

  // Fetch tag name before deletion for the activity log
  const { data: tag } = await supabase
    .from('tags')
    .select('name')
    .eq('id', tagId)
    .eq('organisation_id', orgId)
    .single()

  const { error } = await supabase
    .from('entity_tags')
    .delete()
    .eq('tag_id', tagId)
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)

  if (error) return { error: 'Failed to remove tag.' }

  // Activity log for client tag removals
  if (entityType === 'client' && tag) {
    await supabase.from('activities').insert({
      organisation_id: orgId,
      client_id:       entityId,
      created_by:      userId,
      type:            'note',
      title:           `Tag removed: ${tag.name}`,
      pinned:          false,
    })
  }

  revalidatePath(`/dashboard/clients/${entityId}`)
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/pipeline')
  if (entityType === 'job') revalidatePath(`/dashboard/jobs/${entityId}`)
  return {}
}
