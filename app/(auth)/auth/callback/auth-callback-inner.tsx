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
        if (!profile.isOnboarded) {
          router.push('/onboarding')
          return
        }

        // Redirect to appropriate dashboard based on role
        const dashboard = ROLE_DASHBOARDS[profile.role as UserRole] || '/solo'
        router.push(dashboard)
      } else {
        // New user - create profile
        const newProfile = await createUserProfile(supabase, user)
        if (newProfile) {
          setUserFromProfile(newProfile)
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
    .single()

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

  // 2. Check bs_staff table
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('*')
    .eq('id', user.id)
    .single()

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
    .single()

  if (instructor) {
    return {
      id: user.id,
      email: instructor.email || user.email || '',
      firstName: instructor.first_name || '',
      lastName: instructor.last_name || '',
      role: instructor.role || 'trainer',
    }
  }

  // 4. Check fc_clients table
  const { data: client } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('id', user.id)
    .single()

  if (client) {
    return {
      id: user.id,
      email: client.email || user.email || '',
      firstName: client.first_name || client.name?.split(' ')[0] || '',
      lastName: client.last_name || client.name?.split(' ').slice(1).join(' ') || '',
      role: 'client',
      studioId: client.studio_id,
    }
  }

  return null
}

/**
 * Create a new user profile for first-time users
 * Default to solo_practitioner role
 */
async function createUserProfile(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<{ id: string; email: string; firstName: string; lastName: string; role: string } | null> {
  const metadata = user.user_metadata || {}

  const firstName = (metadata.given_name as string) || (metadata.first_name as string) || (metadata.full_name as string)?.split(' ')[0] || ''
  const lastName = (metadata.family_name as string) || (metadata.last_name as string) || (metadata.full_name as string)?.split(' ').slice(1).join(' ') || ''

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      role: 'solo_practitioner',
      is_onboarded: false,
      is_active: true,
      platform_version: 'v2',
      v2_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    return null
  }

  return {
    id: data.id,
    email: data.email || user.email || '',
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    role: data.role || 'solo_practitioner',
  }
}
