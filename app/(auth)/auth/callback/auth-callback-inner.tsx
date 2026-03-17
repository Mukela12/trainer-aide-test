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
        // Check if this is a password recovery flow
        const type = searchParams.get('type')

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
              // If this is a recovery flow, redirect to reset password page
              if (type === 'recovery') {
                router.push('/reset-password')
                return
              }
              await processUser(supabase, data.session.user)
              return
            }
          }

          // Fallback: handle token_hash flow (Supabase email templates may use this)
          const tokenHash = searchParams.get('token_hash')
          if (tokenHash && type) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              type: type as 'recovery' | 'signup' | 'email',
              token_hash: tokenHash,
            })
            if (verifyError) {
              setError(verifyError.message)
              return
            }
            if (type === 'recovery') {
              router.push('/reset-password')
              return
            }
            // Re-check session after OTP verification
            const { data: { session: newSession } } = await supabase.auth.getSession()
            if (newSession) {
              await processUser(supabase, newSession.user)
              return
            }
          }

          setError('No session found')
          return
        }

        // If this is a recovery flow with existing session, redirect to reset password
        if (type === 'recovery') {
          router.push('/reset-password')
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
      // Check for returnTo parameter (from invitation redirects)
      const returnTo = searchParams.get('returnTo')

      // Look up user profile using multi-table strategy
      const profile = await lookupUserProfile(supabase, user)

      if (profile) {
        // Detect trigger-created stub profiles (role='client', is_onboarded=false)
        // These are auto-created by a database trigger when auth users are created.
        // New signups should go to onboarding, not the client dashboard.
        const isTriggerStub = profile.role === 'client' && !profile.isOnboarded
        if (isTriggerStub) {
          // Treat as new user — send to onboarding
          setUserFromProfile({ ...profile, role: 'solo_practitioner' })
          router.push('/onboarding')
          return
        }

        // Update Zustand store with profile data
        setUserFromProfile(profile)

        // Check if user needs onboarding
        // Only solo_practitioner and studio_owner need onboarding
        // Staff roles (trainer, receptionist, finance_manager, studio_manager) and clients skip it
        const needsOnboarding = profile.role === 'solo_practitioner' || profile.role === 'studio_owner'
        if (!profile.isOnboarded && needsOnboarding) {
          router.push('/onboarding')
          return
        }

        // If returnTo is specified and is a valid internal path, redirect there
        // This handles invitation flow redirects after login
        if (returnTo && returnTo.startsWith('/')) {
          router.push(returnTo)
          return
        }

        // Redirect to appropriate dashboard based on role
        const dashboard = ROLE_DASHBOARDS[profile.role as UserRole] || '/solo'
        router.push(dashboard)
      } else {
        // Before checking fc_clients, retry profile lookup once (trigger may have raced)
        const retryProfile = await lookupUserProfile(supabase, user)
        if (retryProfile) {
          const isStub = retryProfile.role === 'client' && !retryProfile.isOnboarded
          if (isStub) {
            setUserFromProfile({ ...retryProfile, role: 'solo_practitioner' })
            router.push('/onboarding')
            return
          }
          setUserFromProfile(retryProfile)
          const dashboard = ROLE_DASHBOARDS[retryProfile.role as UserRole] || '/solo'
          router.push(dashboard)
          return
        }

        // Check if user might be a client (via server API to bypass RLS)
        const clientCheck = await fetch(`/api/auth/check-client?email=${encodeURIComponent(user.email || '')}`)
        if (clientCheck.ok) {
          const clientData = await clientCheck.json()
          if (clientData.isClient) {
            // Check if a trigger-created stub profile exists (new signup that also has a client record)
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('is_onboarded')
              .eq('id', user.id)
              .maybeSingle()

            if (existingProfile && !existingProfile.is_onboarded) {
              // New signup with a pre-existing client record — send to onboarding
              setUserFromProfile({
                id: user.id,
                email: user.email || '',
                firstName: clientData.firstName || '',
                lastName: clientData.lastName || '',
                role: 'solo_practitioner',
                isOnboarded: false,
              })
              router.push('/onboarding')
              return
            }

            // User is a known client — create/update profile and redirect to client dashboard
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

            // Check for returnTo before defaulting to client dashboard
            if (returnTo && returnTo.startsWith('/')) {
              router.push(returnTo)
              return
            }
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

          // Check for returnTo before defaulting to role dashboard
          if (returnTo && returnTo.startsWith('/')) {
            router.push(returnTo)
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
): Promise<{ id: string; email: string; firstName: string; lastName: string; role: string; studioId?: string; isOnboarded?: boolean; businessSlug?: string; businessName?: string } | null> {

  // 1. Check profiles table first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    // Cross-reference bs_staff to get authoritative role/onboarding status
    // Profile may have stale data if it was created before invitation was accepted
    const { data: staffRecord } = await supabase
      .from('bs_staff')
      .select('staff_type, is_onboarded, studio_id, is_solo, first_name, last_name, email')
      .eq('id', user.id)
      .maybeSingle()

    if (staffRecord) {
      const staffRoleMap: Record<string, string> = {
        owner: 'studio_owner',
        studio_owner: 'studio_owner',
        manager: 'studio_manager',
        instructor: 'trainer',
        trainer: 'trainer',
        receptionist: 'receptionist',
        finance: 'finance_manager',
        finance_manager: 'finance_manager',
      }
      const staffRole = staffRecord.is_solo
        ? 'solo_practitioner'
        : (staffRoleMap[staffRecord.staff_type] || 'trainer')
      return {
        id: profile.id,
        email: profile.email || staffRecord.email || user.email || '',
        firstName: profile.first_name || staffRecord.first_name || '',
        lastName: profile.last_name || staffRecord.last_name || '',
        role: staffRole,
        studioId: staffRecord.studio_id,
        isOnboarded: staffRecord.is_onboarded === true || profile.is_onboarded === true,
        businessSlug: profile.business_slug || undefined,
        businessName: profile.business_name || undefined,
      }
    }

    return {
      id: profile.id,
      email: profile.email || user.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: mapRole(profile.role),
      isOnboarded: profile.is_onboarded === true,
      businessSlug: profile.business_slug || undefined,
      businessName: profile.business_name || undefined,
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
        businessSlug: profileByEmail.business_slug || undefined,
        businessName: profileByEmail.business_name || undefined,
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
      studio_owner: 'studio_owner',
      manager: 'studio_manager',
      instructor: 'trainer',
      trainer: 'trainer',
      receptionist: 'receptionist',
      finance: 'finance_manager',
      finance_manager: 'finance_manager',
    }
    return {
      id: user.id,
      email: staff.email || user.email || '',
      firstName: staff.first_name || '',
      lastName: staff.last_name || '',
      role: staff.is_solo ? 'solo_practitioner' : (roleMap[staff.staff_type] || 'trainer'),
      studioId: staff.studio_id,
      isOnboarded: staff.is_onboarded === true, // Include onboarding status from bs_staff
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
        studio_owner: 'studio_owner',
        manager: 'studio_manager',
        instructor: 'trainer',
        trainer: 'trainer',
        receptionist: 'receptionist',
        finance: 'finance_manager',
        finance_manager: 'finance_manager',
      }
      return {
        id: user.id,
        email: staffByEmail.email || user.email || '',
        firstName: staffByEmail.first_name || '',
        lastName: staffByEmail.last_name || '',
        role: staffByEmail.is_solo ? 'solo_practitioner' : (roleMap[staffByEmail.staff_type] || 'trainer'),
        studioId: staffByEmail.studio_id,
        isOnboarded: staffByEmail.is_onboarded === true, // Include onboarding status from bs_staff
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
      isOnboarded: instructor.is_onboarded === true, // Include onboarding status
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
        isOnboarded: instructorByEmail.is_onboarded === true, // Include onboarding status
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

  // First check if profile already exists (e.g., created by invitation acceptance)
  // to avoid overwriting role and onboarding status
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    // Profile already exists — return it without overwriting
    return {
      id: existing.id,
      email: existing.email || user.email || '',
      firstName: existing.first_name || '',
      lastName: existing.last_name || '',
      role: mapRole(existing.role),
      isOnboarded: existing.is_onboarded === true,
    }
  }

  // New user — create profile with default solo_practitioner role
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
