/**
 * Profile Service
 *
 * Multi-table profile lookup strategy for Wondrous database.
 * Checks: profiles → bs_staff → instructors → fc_clients
 */

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { UserRole } from '@/lib/permissions'

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  studioId?: string | null
  trainerId?: string | null
  avatarUrl?: string | null
  isOnboarded: boolean
  createdAt?: string
}

/**
 * Map profile role to UserRole type
 */
function mapRole(role: string | null): UserRole {
  const roleMap: Record<string, UserRole> = {
    super_admin: 'super_admin',
    studio_owner: 'studio_owner',
    studio_manager: 'studio_manager',
    trainer: 'trainer',
    solo_practitioner: 'solo_practitioner',
    receptionist: 'receptionist',
    finance_manager: 'finance_manager',
    client: 'client',
    // Legacy mappings
    fc_client: 'client',
    instructor: 'trainer',
  }
  return roleMap[role || ''] || 'solo_practitioner'
}

/**
 * Get user profile using multi-table lookup strategy
 * Server-side only - uses cookies for session
 */
export async function getProfileServer(userId: string): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient()

  // 1. Check profiles table first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profile) {
    return {
      id: profile.id,
      email: profile.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: mapRole(profile.role),
      avatarUrl: profile.avatar_url || profile.avatar,
      isOnboarded: profile.is_onboarded || profile.onboarding_complete || false,
      createdAt: profile.created_at,
    }
  }

  // 2. Check bs_staff table
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('*')
    .eq('id', userId)
    .single()

  if (staff) {
    const roleMap: Record<string, UserRole> = {
      owner: 'studio_owner',
      manager: 'studio_manager',
      instructor: 'trainer',
      trainer: 'trainer',
      receptionist: 'receptionist',
      finance: 'finance_manager',
    }
    return {
      id: userId,
      email: staff.email || '',
      firstName: staff.first_name || '',
      lastName: staff.last_name || '',
      role: staff.is_solo ? 'solo_practitioner' : (roleMap[staff.staff_type] || 'trainer'),
      studioId: staff.studio_id,
      isOnboarded: staff.is_onboarded || false,
      createdAt: staff.created_at,
    }
  }

  // 3. Check instructors table
  const { data: instructor } = await supabase
    .from('instructors')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (instructor) {
    return {
      id: userId,
      email: instructor.email || '',
      firstName: instructor.first_name || '',
      lastName: instructor.last_name || '',
      role: (instructor.role as UserRole) || 'trainer',
      trainerId: instructor.id,
      avatarUrl: instructor.profile_photo,
      isOnboarded: true,
      createdAt: instructor.created_at,
    }
  }

  // 4. Check fc_clients table
  const { data: client } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('id', userId)
    .single()

  if (client) {
    return {
      id: userId,
      email: client.email || '',
      firstName: client.first_name || client.name?.split(' ')[0] || '',
      lastName: client.last_name || client.name?.split(' ').slice(1).join(' ') || '',
      role: 'client',
      studioId: client.studio_id,
      isOnboarded: client.is_onboarded || false,
      createdAt: client.created_at,
    }
  }

  return null
}

/**
 * Get user profile by ID using service role (admin access)
 */
export async function getProfileById(userId: string): Promise<UserProfile | null> {
  const supabase = createServiceRoleClient()

  // 1. Check profiles table first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profile) {
    return {
      id: profile.id,
      email: profile.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: mapRole(profile.role),
      avatarUrl: profile.avatar_url || profile.avatar,
      isOnboarded: profile.is_onboarded || profile.onboarding_complete || false,
      createdAt: profile.created_at,
    }
  }

  // 2. Check bs_staff table
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('*')
    .eq('id', userId)
    .single()

  if (staff) {
    const roleMap: Record<string, UserRole> = {
      owner: 'studio_owner',
      manager: 'studio_manager',
      instructor: 'trainer',
      trainer: 'trainer',
      receptionist: 'receptionist',
      finance: 'finance_manager',
    }
    return {
      id: userId,
      email: staff.email || '',
      firstName: staff.first_name || '',
      lastName: staff.last_name || '',
      role: staff.is_solo ? 'solo_practitioner' : (roleMap[staff.staff_type] || 'trainer'),
      studioId: staff.studio_id,
      isOnboarded: staff.is_onboarded || false,
      createdAt: staff.created_at,
    }
  }

  // 3. Check instructors table
  const { data: instructor } = await supabase
    .from('instructors')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (instructor) {
    return {
      id: userId,
      email: instructor.email || '',
      firstName: instructor.first_name || '',
      lastName: instructor.last_name || '',
      role: (instructor.role as UserRole) || 'trainer',
      trainerId: instructor.id,
      avatarUrl: instructor.profile_photo,
      isOnboarded: true,
      createdAt: instructor.created_at,
    }
  }

  // 4. Check fc_clients table
  const { data: client } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('id', userId)
    .single()

  if (client) {
    return {
      id: userId,
      email: client.email || '',
      firstName: client.first_name || client.name?.split(' ')[0] || '',
      lastName: client.last_name || client.name?.split(' ').slice(1).join(' ') || '',
      role: 'client',
      studioId: client.studio_id,
      isOnboarded: client.is_onboarded || false,
      createdAt: client.created_at,
    }
  }

  return null
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<{
    firstName: string
    lastName: string
    avatarUrl: string
  }>
): Promise<UserProfile | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: updates.firstName,
      last_name: updates.lastName,
      avatar_url: updates.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }

  return {
    id: data.id,
    email: data.email || '',
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    role: mapRole(data.role),
    avatarUrl: data.avatar_url,
    isOnboarded: data.is_onboarded || false,
    createdAt: data.created_at,
  }
}

/**
 * Create a new profile for a user
 */
export async function createProfile(
  userId: string,
  profileData: {
    email: string
    firstName?: string
    lastName?: string
    role?: UserRole
  }
): Promise<UserProfile | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: profileData.email,
      first_name: profileData.firstName || '',
      last_name: profileData.lastName || '',
      role: profileData.role || 'solo_practitioner',
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
    email: data.email || '',
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    role: mapRole(data.role),
    isOnboarded: false,
    createdAt: data.created_at,
  }
}

/**
 * Check if a profile exists for a user
 */
export async function profileExists(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  return !!data
}

/**
 * Lookup user profile with studio_id using service role client
 * Used by API routes to get user profile data
 */
export async function lookupUserProfile(
  supabase: ReturnType<typeof createServiceRoleClient>,
  user: { id: string; email?: string }
): Promise<{
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  studio_id?: string | null
  studioId?: string | null
} | null> {
  // 1. Check profiles table first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    let studioId = profile.studio_id || null
    const role = mapRole(profile.role)

    // If no studio_id in profile, try to find it from other sources
    if (!studioId) {
      // 1. Check bs_staff for studio association
      const { data: staff } = await supabase
        .from('bs_staff')
        .select('studio_id')
        .eq('id', user.id)
        .maybeSingle()

      if (staff?.studio_id) {
        studioId = staff.studio_id
      }

      // 2. If still no studio_id and user is studio_owner/manager, check bs_studios
      if (!studioId && (role === 'studio_owner' || role === 'studio_manager')) {
        const { data: studio } = await supabase
          .from('bs_studios')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (studio) {
          studioId = studio.id
        }
      }
    }

    return {
      id: profile.id,
      email: profile.email || user.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: role,
      studio_id: studioId,
      studioId: studioId,
    }
  }

  // 2. Check bs_staff table
  const { data: staff } = await supabase
    .from('bs_staff')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (staff) {
    const roleMap: Record<string, UserRole> = {
      owner: 'studio_owner',
      manager: 'studio_manager',
      instructor: 'trainer',
      trainer: 'trainer',
      receptionist: 'receptionist',
      finance: 'finance_manager',
    }
    const role = staff.is_solo ? 'solo_practitioner' : (roleMap[staff.staff_type] || 'trainer')
    return {
      id: user.id,
      email: staff.email || user.email || '',
      firstName: staff.first_name || '',
      lastName: staff.last_name || '',
      role: role,
      studio_id: staff.studio_id,
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
      role: (instructor.role as UserRole) || 'trainer',
      studio_id: instructor.studio_id || null,
      studioId: instructor.studio_id || null,
    }
  }

  // 4. Check fc_clients table
  const { data: client } = await supabase
    .from('fc_clients')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (client) {
    return {
      id: user.id,
      email: client.email || user.email || '',
      firstName: client.first_name || client.name?.split(' ')[0] || '',
      lastName: client.last_name || client.name?.split(' ').slice(1).join(' ') || '',
      role: 'client',
      studio_id: client.studio_id,
      studioId: client.studio_id,
    }
  }

  return null
}
