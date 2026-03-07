'use server'

// src/lib/actions/checklist-photos.ts
// =============================================================================
// LUSTRE — Checklist photo server actions
//
// Photos are uploaded client-side directly to Supabase Storage (private bucket).
// These actions handle recording metadata in the DB and deleting records + files.
// =============================================================================

import { getOrgAndUser } from './_auth'

const BUCKET = 'checklist-photos'

/**
 * Record photo metadata in the DB after a successful client-side upload.
 * Called immediately after the Storage upload succeeds.
 */
export async function savePhotoMetadataAction(
  itemId:      string,
  storagePath: string,
  fileName:    string,
  fileSize:    number | null,
  mimeType:    string | null
): Promise<{ error?: string; id?: string }> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  // Verify the item belongs to this org
  const { data: item } = await supabase
    .from('job_checklist_items')
    .select('id')
    .eq('id', itemId)
    .eq('organisation_id', orgId)
    .single()

  if (!item) return { error: 'Checklist item not found.' }

  const { data, error } = await supabase
    .from('job_checklist_photos')
    .insert({
      organisation_id:       orgId,
      job_checklist_item_id: itemId,
      storage_path:          storagePath,
      file_name:             fileName,
      file_size_bytes:       fileSize,
      mime_type:             mimeType,
      uploaded_by:           userId,
    })
    .select('id')
    .single()

  if (error) return { error: 'Failed to save photo record. Please try again.' }
  return { id: data.id }
}

/**
 * Delete a photo: removes from Supabase Storage and the DB record.
 * Called from the lightbox delete button while the job is in_progress.
 */
export async function deletePhotoAction(
  photoId: string
): Promise<{ error?: string }> {
  const { supabase, orgId } = await getOrgAndUser()

  // Fetch the record to get the storage_path
  const { data: photo } = await supabase
    .from('job_checklist_photos')
    .select('id, storage_path, organisation_id')
    .eq('id', photoId)
    .eq('organisation_id', orgId)
    .single()

  if (!photo) return { error: 'Photo not found.' }

  // Remove from Storage (non-fatal if it fails — DB record still gets deleted)
  await supabase.storage.from(BUCKET).remove([photo.storage_path])

  const { error } = await supabase
    .from('job_checklist_photos')
    .delete()
    .eq('id', photoId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete photo.' }
  return {}
}
