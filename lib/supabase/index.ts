/**
 * Supabase Client Barrel Export
 *
 * This project uses TWO Supabase instances:
 *
 * 1. Main Database (Wondrous) - rzjiztpiiyxbgxngpdvc.supabase.co
 *    - Auth, Users, Profiles, Templates, Sessions, RBAC
 *    - Use: createClient, createServerSupabaseClient, createServiceRoleClient
 *
 * 2. Images Database (Trainer-Aide) - scpfuwijsbjxuhfwoogg.supabase.co
 *    - Exercise images storage only
 *    - Use: imagesSupabase
 */

// Main Database (Wondrous) - Browser client
// Note: Only getSupabaseBrowserClient is exported to enforce singleton pattern
export { getSupabaseBrowserClient } from './client'

// Main Database (Wondrous) - Server clients
export { createServerSupabaseClient, createServiceRoleClient } from './server'

// Main Database (Wondrous) - Middleware client
export { createMiddlewareClient, updateSession } from './middleware'

// Images Database (Trainer-Aide) - Storage client
export { imagesSupabase, isImagesSupabaseConfigured } from './images-client'
