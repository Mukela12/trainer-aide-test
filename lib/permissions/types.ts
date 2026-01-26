/**
 * RBAC Type Definitions
 *
 * 8 Roles matching the Wondrous RBAC system:
 * - super_admin: Full system access
 * - solo_practitioner: Acts as their own studio (1 person, 1 location)
 * - studio_owner: Full access to their studio(s)
 * - studio_manager: Manages studio operations
 * - trainer: Conducts training sessions
 * - receptionist: Front desk operations
 * - finance_manager: Financial operations
 * - client: End user receiving training
 */

export type UserRole =
  | 'super_admin'
  | 'solo_practitioner'
  | 'studio_owner'
  | 'studio_manager'
  | 'trainer'
  | 'receptionist'
  | 'finance_manager'
  | 'client'

/**
 * Permission categories for the system
 * Format: category:resource:action
 */
export type Permission =
  // Trainer Aide Permissions
  | 'trainer_aide:templates:view'
  | 'trainer_aide:templates:create'
  | 'trainer_aide:templates:edit'
  | 'trainer_aide:templates:delete'
  | 'trainer_aide:assign:clients'
  | 'trainer_aide:progress:view'
  | 'trainer_aide:programs:export'
  | 'trainer_aide:sessions:view'
  | 'trainer_aide:sessions:create'
  | 'trainer_aide:sessions:complete'
  // Client Permissions
  | 'clients:view'
  | 'clients:create'
  | 'clients:edit'
  | 'clients:delete'
  // Booking Permissions
  | 'bookings:view'
  | 'bookings:create'
  | 'bookings:edit'
  | 'bookings:cancel'
  // Schedule Permissions
  | 'schedule:view'
  | 'schedule:manage'
  // Services Permissions
  | 'services:view'
  | 'services:create'
  | 'services:edit'
  | 'services:delete'
  // Packages Permissions
  | 'packages:view'
  | 'packages:create'
  | 'packages:edit'
  | 'packages:delete'
  // Team Permissions
  | 'team:view'
  | 'team:invite'
  | 'team:manage'
  | 'team:remove'
  // Location Permissions
  | 'locations:view'
  | 'locations:create'
  | 'locations:edit'
  | 'locations:delete'
  // Settings Permissions
  | 'settings:view'
  | 'settings:edit'
  // Finance Permissions
  | 'finance:view'
  | 'finance:manage'
  // Admin Permissions
  | 'admin:full_access'

/**
 * User profile data from Supabase
 */
export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  studioId?: string | null
  trainerId?: string | null
  avatarUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

/**
 * Dashboard mapping for each role
 */
export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  super_admin: '/studio-owner',
  solo_practitioner: '/solo',
  studio_owner: '/studio-owner',
  studio_manager: '/studio-owner',
  trainer: '/trainer',
  receptionist: '/trainer',
  finance_manager: '/studio-owner',
  client: '/client',
}

/**
 * Human-readable role labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  solo_practitioner: 'Solo Practitioner',
  studio_owner: 'Studio Owner',
  studio_manager: 'Studio Manager',
  trainer: 'Trainer',
  receptionist: 'Receptionist',
  finance_manager: 'Finance Manager',
  client: 'Client',
}
