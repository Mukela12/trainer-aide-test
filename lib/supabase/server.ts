/**
 * Server client for Main Database (Wondrous)
 * Used for: Server-side auth, API routes, Server Components
 * Handles cookie management for SSR auth
 * Also supports Authorization header for API testing
 */

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function createServerSupabaseClient() {
  // Dynamic import to avoid bundling server-only code in client
  const { cookies } = await import('next/headers')
  const { headers } = await import('next/headers')
  const cookieStore = await cookies()
  const headerStore = await headers()

  // Check for Authorization header (Bearer token)
  const authHeader = headerStore.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // Create client with the token directly
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    return supabase
  }

  // Default: use cookies for auth
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Service role client for admin operations
 * Bypasses RLS - use with caution!
 */
export function createServiceRoleClient() {
  const { createClient } = require('@supabase/supabase-js')

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
