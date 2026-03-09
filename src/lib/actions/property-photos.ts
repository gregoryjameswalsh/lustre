'use server'

// src/lib/actions/property-photos.ts
// =============================================================================
// LUSTRE — Property photo server actions
//
// Photos are uploaded client-side directly to Supabase Storage (private bucket).
// These actions handle recording metadata in the DB and deleting records + files.
// Client-side compression (browser-image-compression) runs before upload,
// targeting 1 MiB / 2048px. The bucket enforces a 5 MiB backstop.
// =============================================================================

import { getOrgAndUser } from './_auth'
import { logAuditEvent } from '@/lib/audit'

const BUCKET = 'property-photos'

/**
 * Record photo metadata in the DB after a successful client-side upload.
 * Called immediately after the Storage upload succeeds.
 */
export async function savePropertyPhotoMetadataAction(
  propertyId:  string,
  storagePath: string,
  fileName:    string,
  fileSize:    number | null,
  mimeType:    string | null,
  caption:     string | null,
): Promise<{ error?: string; id?: string }> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  // Verify the property belongs to this org
  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('organisation_id', orgId)
    .single()

  if (!property) return { error: 'Property not found.' }

  const { data, error } = await supabase
    .from('property_photos')
    .insert({
      organisation_id: orgId,
      property_id:     propertyId,
      storage_path:    storagePath,
      file_name:       fileName,
      file_size_bytes: fileSize,
      mime_type:       mimeType,
      caption:         caption,
      uploaded_by:     userId,
    })
    .select('id')
    .single()

  if (error) return { error: 'Failed to save photo record. Please try again.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action:       'upload_property_photo',
    resourceType: 'property',
    resourceId:   propertyId,
    metadata:     { fileName, fileSize },
  })

  return { id: data.id }
}

/**
 * Set or unset a photo as the main (hero) photo for a property.
 * Passing makeMain=true clears any existing main first (enforced by DB
 * partial unique index, so we clear first to avoid conflicts).
 * Passing makeMain=false unsets without promoting another.
 */
export async function setMainPropertyPhotoAction(
  photoId:  string,
  propertyId: string,
  makeMain: boolean,
): Promise<{ error?: string }> {
  const { supabase, orgId } = await getOrgAndUser()

  // Verify the photo belongs to this org + property
  const { data: photo } = await supabase
    .from('property_photos')
    .select('id')
    .eq('id', photoId)
    .eq('property_id', propertyId)
    .eq('organisation_id', orgId)
    .single()

  if (!photo) return { error: 'Photo not found.' }

  if (makeMain) {
    // Clear existing main first (partial unique index only allows one)
    await supabase
      .from('property_photos')
      .update({ is_main: false })
      .eq('property_id', propertyId)
      .eq('organisation_id', orgId)
      .eq('is_main', true)
  }

  const { error } = await supabase
    .from('property_photos')
    .update({ is_main: makeMain })
    .eq('id', photoId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to update main photo.' }
  return {}
}

/**
 * Delete a photo: removes from Supabase Storage and the DB record.
 */
export async function deletePropertyPhotoAction(
  photoId: string
): Promise<{ error?: string }> {
  const { supabase, orgId, userId } = await getOrgAndUser()

  // Fetch the record to get storage_path and property_id for audit
  const { data: photo } = await supabase
    .from('property_photos')
    .select('id, storage_path, property_id, file_name')
    .eq('id', photoId)
    .eq('organisation_id', orgId)
    .single()

  if (!photo) return { error: 'Photo not found.' }

  // Remove from Storage (non-fatal if it fails — DB record still gets deleted)
  await supabase.storage.from(BUCKET).remove([photo.storage_path])

  const { error } = await supabase
    .from('property_photos')
    .delete()
    .eq('id', photoId)
    .eq('organisation_id', orgId)

  if (error) return { error: 'Failed to delete photo.' }

  await logAuditEvent(supabase, {
    orgId, actorId: userId,
    action:       'delete_property_photo',
    resourceType: 'property',
    resourceId:   photo.property_id,
    metadata:     { fileName: photo.file_name },
  })

  return {}
}
