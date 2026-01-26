/**
 * Server-side Supabase client with service role key
 * Bypasses RLS for backend operations
 *
 * NOTE: This file is kept for backwards compatibility.
 * For new code, import from @/lib/supabase/index.ts
 */

import { createServiceRoleClient } from './supabase/server'

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabaseServer: ReturnType<typeof createServiceRoleClient> | null = null

export const supabaseServer = new Proxy({} as ReturnType<typeof createServiceRoleClient>, {
  get(_, prop) {
    if (!_supabaseServer) {
      _supabaseServer = createServiceRoleClient()
    }
    return (_supabaseServer as any)[prop]
  }
})
