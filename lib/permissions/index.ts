/**
 * Permissions Barrel Export
 *
 * RBAC system for Trainer Aide based on the Wondrous permission matrix.
 */

// Types
export type { UserRole, Permission, UserProfile } from './types'
export { ROLE_DASHBOARDS, ROLE_LABELS } from './types'

// Constants
export { PERMISSIONS, PERMISSION_GROUPS } from './constants'

// Role-Permission Mapping
export { ROLE_PERMISSIONS, getPermissionsForRole } from './role-permissions'

// Permission Check Functions
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getMissingPermissions,
  canAccessTrainerAide,
  canBuildTemplates,
  canRunSessions,
  canAssignToClients,
  canManageTeam,
  canManageLocations,
  isSoloPractitioner,
  isAdminRole,
  isTrainerRole,
} from './check-permission'
