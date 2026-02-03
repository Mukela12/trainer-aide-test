'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { ROLE_DASHBOARDS, UserRole } from '@/lib/permissions'
import { useUserStore } from '@/lib/stores/user-store'

export function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const setUserFromProfile = useUserStore((state) => state.setUserFromProfile)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabaseBrowserClient()

      // Check for error in URL params
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      if (errorParam) {
        setError(errorDescription || errorParam)
        return
      }

      try {
        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setError(sessionError.message)
          return
        }

        if (!session) {
          // Try to exchange code for session
          const code = searchParams.get('code')
          if (code) {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (exchangeError) {
              setError(exchangeError.message)
              return
            }
            if (data.session) {
              await processUser(supabase, data.session.user)
              return
            }
          }
          setError('No session found')
          return
        }

        await processUser(supabase, session.user)
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('An unexpected error occurred during sign in.')
      }
    }

    async function processUser(
      supabase: ReturnType<typeof getSupabaseBrowserClient>,
      user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
    ) {
      // Look up user profile using multi-table strategy
      const profile = await lookupUserProfile(supabase, user)

      if (profile) {
        // Update Zustand store with profile data
        setUserFromProfile(profile)

        // Check if user needs onboarding
        // IMPORTANT: Clients (role = 'client') NEVER need onboarding
        // The onboarding flow is only for solo practitioners and studio owners
        const isClient = profile.role === 'client'
        if (!profile.isOnboarded && !isClient) {
          router.push('/onboarding')
          return
        }

        // Redirect to appropriate dashboard based on role
        const dashboard = ROLE_DASHBOARDS[profile.role as UserRole] || '/solo'
        router.push(dashboard)
      } else {
        // Check if user might be a client (via server API to bypass RLS)
        const clientCheck = await fetch(`/api/auth/check-client?email=${encodeURIComponent(user.email || '')}`)
        if (clientCheck.ok) {
          const clientData = await clientCheck.json()
          if (clientData.isClient) {
            // User is a client - create profile and redirect to client dashboard
            const clientProfile = {
              id: user.id,
              email: user.email || '',
              firstName: clientData.firstName || '',
              lastName: clientData.lastName || '',
              role: 'client' as const,
              isOnboarded: true,
            }
            setUserFromProfile(clientProfile)

            // Create profile record for the client
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email,
              first_name: clientData.firstName || null,
              last_name: clientData.lastName || null,
              role: 'client',
              is_onboarded: true,
            }, { onConflict: 'id' })

            router.push('/client')
            return
          }
        }

        // New user - create profile
        const newProfile = await createUserProfile(supabase, user)
        if ((newProfile as any)?.error === 'EMAIL_EXISTS') {
          setError('This email is already registered. Please sign in instead.')
          return
        }
        if (newProfile) {
          setUserFromProfile(newProfile)

          // New users need onboarding (except clients, but clients already handled above)
          if (!newProfile.isOnboarded) {
            router.push('/onboarding')
            return
          }

          const dashboard = ROLE_DASHBOARDS[newProfile.role as UserRole] || '/solo'
          router.push(dashboard)
        } else {
          setError('Failed to create user profile')
        }
      }
    }

    handleCallback()
  }, [router, searchParams, setUserFromProfile])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-red-200 dark:border-red-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              Sign In Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Completing sign in...
        </p>
      </div>
    </div>
  )
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
 * 1. Check profiles table
 * 2. Check bs_staff table
 * 3. Check instructors table
 * 4. Check fc_clients table
 */
async function lookupUserProfile(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  user: { id: string; email?: string }
): Promise<{ id: string; email: string; firstName: string; lastName: string; role: string; studioId?: string; isOnboarded?: boolean } | null> {

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
      isOnboarded: profile.is_onboarded === true,
    }
  }

  // 1b. Fallback: Check profiles by email (handles auth provider switch)
  if (user.email) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (profileByEmail) {
      return {
        id: profileByEmail.id,
        email: profileByEmail.email || user.email || '',
        firstName: profileByEmail.first_name || '',
        lastName: profileByEmail.last_name || '',
        role: mapRole(profileByEmail.role),
        isOnboarded: profileByEmail.is_onboarded === true,
      }
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

  // 2b. Fallback: Check bs_staff by email
  if (user.email) {
    const { data: staffByEmail } = await supabase
      .from('bs_staff')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (staffByEmail) {
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
        email: staffByEmail.email || user.email || '',
        firstName: staffByEmail.first_name || '',
        lastName: staffByEmail.last_name || '',
        role: staffByEmail.is_solo ? 'solo_practitioner' : (roleMap[staffByEmail.staff_type] || 'trainer'),
        studioId: staffByEmail.studio_id,
      }
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

  // 3b. Fallback: Check instructors by email
  if (user.email) {
    const { data: instructorByEmail } = await supabase
      .from('instructors')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (instructorByEmail) {
      return {
        id: user.id,
        email: instructorByEmail.email || user.email || '',
        firstName: instructorByEmail.first_name || '',
        lastName: instructorByEmail.last_name || '',
        role: instructorByEmail.role || 'trainer',
      }
    }
  }

  // 4. For fc_clients, we skip direct browser queries due to RLS restrictions
  // If user is not found in profiles/bs_staff/instructors, they might be a client
  // Return null to trigger profile creation for new users
  return null
}

/**
 * Create a new user profile for first-time users
 * Default to solo_practitioner role
 */
async function createUserProfile(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<{ id: string; email: string; firstName: string; lastName: string; role: string; isOnboarded: boolean } | null> {
  const metadata = user.user_metadata || {}

  const firstName = (metadata.given_name as string) || (metadata.first_name as string) || (metadata.full_name as string)?.split(' ')[0] || ''
  const lastName = (metadata.family_name as string) || (metadata.last_name as string) || (metadata.full_name as string)?.split(' ').slice(1).join(' ') || ''

  // Use upsert with onConflict: 'id' to handle double-execution gracefully
  // (e.g., if auth callback runs twice due to redirects or re-renders)
  // If a DIFFERENT user ID tries to use the same email, we'll get a unique constraint error
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      role: 'solo_practitioner',
      is_onboarded: false,
      is_active: true,
      platform_version: 'v2',
      v2_active: true,
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    // Check if it's a duplicate email error (different user ID has this email)
    if (error.code === '23505' && error.message?.includes('profiles_email_key')) {
      return { error: 'EMAIL_EXISTS' } as any  // Special marker for duplicate email
    }
    return null
  }

  return {
    id: data.id,
    email: data.email || user.email || '',
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    role: data.role || 'solo_practitioner',
    isOnboarded: data.is_onboarded === true,
  }
}
