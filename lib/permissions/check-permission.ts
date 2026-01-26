/**
 * Permission Check Functions
 *
 * Utilities for checking if a user has specific permissions.
 */

import { UserRole, Permission } from './types'
import { ROLE_PERMISSIONS } from './role-permissions'
import { PERMISSIONS } from './constants'

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []

  // Super admin with full access can do anything
  if (permissions.includes(PERMISSIONS.ADMIN.FULL_ACCESS as Permission)) {
    return true
  }

  return permissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions that a role is missing from a required list
 */
export function getMissingPermissions(role: UserRole, requiredPermissions: Permission[]): Permission[] {
  return requiredPermissions.filter(permission => !hasPermission(role, permission))
}

/**
 * Check if a role can access Trainer Aide features
 */
export function canAccessTrainerAide(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.TRAINER_AIDE.VIEW_TEMPLATES as Permission,
    PERMISSIONS.TRAINER_AIDE.VIEW_SESSIONS as Permission,
  ])
}

/**
 * Check if a role can build/edit templates
 */
export function canBuildTemplates(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.TRAINER_AIDE.CREATE_TEMPLATES as Permission)
}

/**
 * Check if a role can run training sessions
 */
export function canRunSessions(role: UserRole): boolean {
  return hasAllPermissions(role, [
    PERMISSIONS.TRAINER_AIDE.CREATE_SESSIONS as Permission,
    PERMISSIONS.TRAINER_AIDE.COMPLETE_SESSIONS as Permission,
  ])
}

/**
 * Check if a role can assign workouts to clients
 */
export function canAssignToClients(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.TRAINER_AIDE.ASSIGN_TO_CLIENTS as Permission)
}

/**
 * Check if a role can manage team members
 */
export function canManageTeam(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.TEAM.INVITE as Permission,
    PERMISSIONS.TEAM.MANAGE as Permission,
  ])
}

/**
 * Check if a role can manage multiple locations
 */
export function canManageLocations(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.LOCATIONS.CREATE as Permission,
    PERMISSIONS.LOCATIONS.EDIT as Permission,
  ])
}

/**
 * Check if this is a solo practitioner (no team/location features)
 */
export function isSoloPractitioner(role: UserRole): boolean {
  return role === 'solo_practitioner'
}

/**
 * Check if this role has admin-level access
 */
export function isAdminRole(role: UserRole): boolean {
  return ['super_admin', 'studio_owner', 'studio_manager'].includes(role)
}

/**
 * Check if this role is primarily a client-facing trainer role
 */
export function isTrainerRole(role: UserRole): boolean {
  return ['trainer', 'solo_practitioner'].includes(role)
}
