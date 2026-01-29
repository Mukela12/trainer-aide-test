/**
 * Browser client for Main Database (Wondrous)
 * Used for: Authentication, Users, Profiles, Templates, Sessions, RBAC
 *
 * IMPORTANT: Always use getSupabaseBrowserClient() to avoid multiple GoTrueClient instances
 */

import { createBrowserClient } from '@supabase/ssr'

// Infer the type from createBrowserClient return type
type BrowserClient = ReturnType<typeof createBrowserClient>

// Module-level singleton to ensure only one instance exists
let browserClient: BrowserClient | null = null

/**
 * Internal function to create a new browser client
 * Should not be used directly - use getSupabaseBrowserClient() instead
 */
function createClient(): BrowserClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Get singleton Supabase browser client
 * This is the ONLY function that should be used to get a browser client
 * to avoid "Multiple GoTrueClient instances detected" warnings
 */
export function getSupabaseBrowserClient(): BrowserClient {
  if (typeof window === 'undefined') {
    // Server-side: always create new client (but this shouldn't be used server-side)
    // Use createServerSupabaseClient() from server.ts for server components
    return createClient()
  }

  // Client-side: use singleton pattern
  if (!browserClient) {
    browserClient = createClient()
  }
  return browserClient
}
