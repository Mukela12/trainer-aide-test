/**
 * Server-side Supabase client with service role key
 * Bypasses RLS for backend operations
 *
 * NOTE: This file is kept for backwards compatibility.
 * For new code, import from @/lib/supabase/index.ts
 */

import { createServiceRoleClient } from './supabase/server'

// Re-export for backwards compatibility
export const supabaseServer = createServiceRoleClient()
