'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useUserStore } from '@/lib/stores/user-store'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Map profile role to UserRole type
 */
function mapRole(role: string | null): string {
  const roleMap: Record<string, string> = {
    super_admin: 'super_admin',
    studio_owner: 'studio_owner',
    studio_manager: 'studio_manager',
    trainer: 'trainer',
    solo_practitioner: 'solo_practitioner',
    receptionist: 'receptionist',
    finance_manager: 'finance_manager',
    client: 'client',
    fc_client: 'client',
    instructor: 'trainer',
  }
  return roleMap[role || ''] || 'solo_practitioner'
}

/**
 * Multi-table profile lookup strategy
 */
async function lookupUserProfile(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  user: { id: string; email?: string }
): Promise<{ id: string; email: string; firstName: string; lastName: string; role: string; studioId?: string; businessSlug?: string; businessName?: string } | null> {
  // 1. Check profiles table first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    return {
      id: profile.id,
      email: profile.email || user.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: mapRole(profile.role),
      businessSlug: profile.business_slug || undefined,
      businessName: profile.business_name || undefined,
    }
  }

  // 2. Check bs_staff table
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (staff) {
    const roleMap: Record<string, string> = {
      owner: 'studio_owner',
      manager: 'studio_manager',
      instructor: 'trainer',
      trainer: 'trainer',
      receptionist: 'receptionist',
      finance: 'finance_manager',
    }
    return {
      id: user.id,
      email: staff.email || user.email || '',
      firstName: staff.first_name || '',
      lastName: staff.last_name || '',
      role: staff.is_solo ? 'solo_practitioner' : (roleMap[staff.staff_type] || 'trainer'),
      studioId: staff.studio_id,
    }
  }

  // 3. Check instructors table
  const { data: instructor } = await supabase
    .from('instructors')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (instructor) {
    return {
      id: user.id,
      email: instructor.email || user.email || '',
      firstName: instructor.first_name || '',
      lastName: instructor.last_name || '',
      role: instructor.role || 'trainer',
    }
  }

  // 4. For fc_clients, we skip direct browser queries due to RLS restrictions
  // If user is not found in profiles/bs_staff/instructors, they might be a client
  // Client data should be fetched via API when needed
  // Return null to trigger profile creation or allow default handling
  return null
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const logout = useUserStore((state) => state.logout)
  const setUserFromProfile = useUserStore((state) => state.setUserFromProfile)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)

  // Hydrate Zustand store from Supabase profile
  const hydrateUserStore = useCallback(async (authUser: User) => {
    // Only hydrate if not already authenticated in Zustand
    // This prevents overwriting during auth callback flow
    if (isAuthenticated) return

    const supabase = getSupabaseBrowserClient()
    const profile = await lookupUserProfile(supabase, authUser)

    if (profile) {
      setUserFromProfile(profile)
    }
  }, [isAuthenticated, setUserFromProfile])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // Get initial session and hydrate Zustand
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession()
      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      // Hydrate Zustand store on page refresh
      if (initialSession?.user) {
        await hydrateUserStore(initialSession.user)
      }

      setIsLoading(false)
    }
    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      // If user signs out, clear the Zustand store
      if (!newSession) {
        logout()
      } else if (newSession.user) {
        // Hydrate store on auth state change (e.g., token refresh)
        await hydrateUserStore(newSession.user)
      }

      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [logout, hydrateUserStore])

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    logout()
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
