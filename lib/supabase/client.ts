/**
 * Browser client for Main Database (Wondrous)
 * Used for: Authentication, Users, Profiles, Templates, Sessions, RBAC
 */

import { createBrowserClient } from '@supabase/ssr'

// Infer the type from createBrowserClient return type
type BrowserClient = ReturnType<typeof createBrowserClient>

// Use a global variable to ensure singleton across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowserClient: BrowserClient | undefined
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Get singleton Supabase browser client
 * Uses global variable to persist across hot reloads
 */
export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    // Server-side: always create new client (shouldn't be used server-side)
    return createClient()
  }

  // Client-side: use global singleton
  if (!globalThis.__supabaseBrowserClient) {
    globalThis.__supabaseBrowserClient = createClient()
  }
  return globalThis.__supabaseBrowserClient
}
