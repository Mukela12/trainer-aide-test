'use client'

/**
 * React Hook for Permission Checks
 *
 * Provides easy access to permission checking in React components.
 */

import { useMemo } from 'react'
import { useUserStore } from '@/lib/stores/user-store'
import {
  UserRole,
  Permission,
  ROLE_DASHBOARDS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessTrainerAide,
  canBuildTemplates,
  canRunSessions,
  canAssignToClients,
  canManageTeam,
  canManageLocations,
  isSoloPractitioner,
  isAdminRole,
  isTrainerRole,
} from '@/lib/permissions'

export function usePermissions() {
  const currentRole = useUserStore((state) => state.currentRole) as UserRole

  return useMemo(() => ({
    // Current role
    role: currentRole,

    // Dashboard for current role
    dashboard: ROLE_DASHBOARDS[currentRole] || '/client',

    // Generic permission checks
    has: (permission: Permission) => hasPermission(currentRole, permission),
    hasAny: (permissions: Permission[]) => hasAnyPermission(currentRole, permissions),
    hasAll: (permissions: Permission[]) => hasAllPermissions(currentRole, permissions),

    // Trainer Aide specific checks
    canAccessTrainerAide: canAccessTrainerAide(currentRole),
    canBuildTemplates: canBuildTemplates(currentRole),
    canRunSessions: canRunSessions(currentRole),
    canAssignToClients: canAssignToClients(currentRole),

    // Studio/Team checks
    canManageTeam: canManageTeam(currentRole),
    canManageLocations: canManageLocations(currentRole),

    // Role type checks
    isSoloPractitioner: isSoloPractitioner(currentRole),
    isAdminRole: isAdminRole(currentRole),
    isTrainerRole: isTrainerRole(currentRole),
  }), [currentRole])
}

/**
 * Hook for checking a single permission
 */
export function useHasPermission(permission: Permission): boolean {
  const currentRole = useUserStore((state) => state.currentRole) as UserRole
  return useMemo(() => hasPermission(currentRole, permission), [currentRole, permission])
}

/**
 * Hook for checking multiple permissions (any)
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const currentRole = useUserStore((state) => state.currentRole) as UserRole
  return useMemo(() => hasAnyPermission(currentRole, permissions), [currentRole, permissions])
}

/**
 * Hook for checking multiple permissions (all)
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const currentRole = useUserStore((state) => state.currentRole) as UserRole
  return useMemo(() => hasAllPermissions(currentRole, permissions), [currentRole, permissions])
}
