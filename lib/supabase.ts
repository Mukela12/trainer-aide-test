/**
 * Exercise Image Helpers
 *
 * This file provides utilities for fetching exercise images from the
 * Images Database (Trainer-Aide - scpfuwijsbjxuhfwoogg.supabase.co)
 *
 * NOTE: This is a separate Supabase instance used ONLY for exercise images.
 * For auth, users, templates, sessions, etc., use the main database clients
 * from @/lib/supabase/index.ts
 */

import { imagesSupabase, isImagesSupabaseConfigured } from './supabase/images-client'

// Re-export for backwards compatibility
export { imagesSupabase as supabase }

/**
 * Constructs the public URL for an exercise image from Supabase storage
 * Uses fuzzy matching to find the correct folder name
 * @param exerciseId - The exercise ID or slug
 * @param exerciseName - Optional exercise name for better matching
 * @param imageType - Either 'start' or 'end'
 * @returns The public URL to the image
 */
export function getExerciseImageUrl(
  exerciseId: string,
  imageType: 'start' | 'end',
  exerciseName?: string
): string {
  // Return placeholder if Supabase is not configured
  if (!isImagesSupabaseConfigured()) {
    return ''
  }

  // Use fuzzy matching to find the correct folder name
  const { getExerciseFolderName, AVAILABLE_SUPABASE_FOLDERS } = require('./utils/exercise-image-mapping')

  const folderName = getExerciseFolderName(
    exerciseId,
    exerciseName,
    AVAILABLE_SUPABASE_FOLDERS
  )

  const { data } = imagesSupabase.storage
    .from('exercise-images')
    .getPublicUrl(`${folderName}/${imageType}.webp`)

  return data.publicUrl
}

/**
 * Checks if an exercise image exists in Supabase storage
 * @param exerciseId - The exercise folder name
 * @param imageType - Either 'start' or 'end'
 * @returns Promise<boolean>
 */
export async function exerciseImageExists(
  exerciseId: string,
  imageType: 'start' | 'end'
): Promise<boolean> {
  // Return false if Supabase is not configured
  if (!isImagesSupabaseConfigured()) {
    return false
  }

  try {
    const { data, error } = await imagesSupabase.storage
      .from('exercise-images')
      .list(exerciseId)

    if (error) return false

    const fileName = `${imageType}.webp`
    return data?.some(file => file.name === fileName) ?? false
  } catch {
    return false
  }
}

/**
 * Gets both start and end image URLs for an exercise
 * Uses fuzzy matching to find the correct folder name
 * @param exerciseId - The exercise ID or slug
 * @param exerciseName - Optional exercise name for better matching
 * @returns Object with startUrl and endUrl
 */
export function getExerciseImages(exerciseId: string, exerciseName?: string) {
  return {
    startUrl: getExerciseImageUrl(exerciseId, 'start', exerciseName),
    endUrl: getExerciseImageUrl(exerciseId, 'end', exerciseName),
  }
}

/**
 * Checks if exercise images exist in Supabase
 * @param exerciseId - The exercise ID
 * @param exerciseName - The exercise name
 * @returns Promise<boolean>
 */
export async function exerciseImagesExist(
  exerciseId: string,
  exerciseName?: string
): Promise<boolean> {
  const { getExerciseFolderName, AVAILABLE_SUPABASE_FOLDERS } = require('./utils/exercise-image-mapping')

  const folderName = getExerciseFolderName(
    exerciseId,
    exerciseName,
    AVAILABLE_SUPABASE_FOLDERS
  )

  const startExists = await exerciseImageExists(folderName, 'start')
  const endExists = await exerciseImageExists(folderName, 'end')

  return startExists && endExists
}
