/**
 * Client for Images Database (Trainer-Aide)
 * Used ONLY for: Exercise images storage bucket
 *
 * This is a separate Supabase instance that stores exercise images.
 * All other data operations should use the main (Wondrous) database.
 */

import { createClient } from '@supabase/supabase-js'

const imagesSupabaseUrl = process.env.NEXT_PUBLIC_IMAGES_SUPABASE_URL || ''
const imagesSupabaseKey = process.env.NEXT_PUBLIC_IMAGES_SUPABASE_KEY || ''

// Create client with fallback values for build time
export const imagesSupabase = createClient(
  imagesSupabaseUrl || 'https://placeholder.supabase.co',
  imagesSupabaseKey || 'placeholder-key'
)

/**
 * Check if images Supabase is properly configured
 */
export function isImagesSupabaseConfigured(): boolean {
  return !!(imagesSupabaseUrl && imagesSupabaseUrl !== 'https://placeholder.supabase.co')
}
