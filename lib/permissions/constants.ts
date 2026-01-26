/**
 * Permission Constants
 *
 * Organized by category for easy reference and type safety
 */

export const PERMISSIONS = {
  // Trainer Aide - Core functionality for this app
  TRAINER_AIDE: {
    VIEW_TEMPLATES: 'trainer_aide:templates:view',
    CREATE_TEMPLATES: 'trainer_aide:templates:create',
    EDIT_TEMPLATES: 'trainer_aide:templates:edit',
    DELETE_TEMPLATES: 'trainer_aide:templates:delete',
    ASSIGN_TO_CLIENTS: 'trainer_aide:assign:clients',
    VIEW_PROGRESS: 'trainer_aide:progress:view',
    EXPORT_PROGRAMS: 'trainer_aide:programs:export',
    VIEW_SESSIONS: 'trainer_aide:sessions:view',
    CREATE_SESSIONS: 'trainer_aide:sessions:create',
    COMPLETE_SESSIONS: 'trainer_aide:sessions:complete',
  },

  // Clients
  CLIENTS: {
    VIEW: 'clients:view',
    CREATE: 'clients:create',
    EDIT: 'clients:edit',
    DELETE: 'clients:delete',
  },

  // Bookings
  BOOKINGS: {
    VIEW: 'bookings:view',
    CREATE: 'bookings:create',
    EDIT: 'bookings:edit',
    CANCEL: 'bookings:cancel',
  },

  // Schedule
  SCHEDULE: {
    VIEW: 'schedule:view',
    MANAGE: 'schedule:manage',
  },

  // Services
  SERVICES: {
    VIEW: 'services:view',
    CREATE: 'services:create',
    EDIT: 'services:edit',
    DELETE: 'services:delete',
  },

  // Packages
  PACKAGES: {
    VIEW: 'packages:view',
    CREATE: 'packages:create',
    EDIT: 'packages:edit',
    DELETE: 'packages:delete',
  },

  // Team
  TEAM: {
    VIEW: 'team:view',
    INVITE: 'team:invite',
    MANAGE: 'team:manage',
    REMOVE: 'team:remove',
  },

  // Locations
  LOCATIONS: {
    VIEW: 'locations:view',
    CREATE: 'locations:create',
    EDIT: 'locations:edit',
    DELETE: 'locations:delete',
  },

  // Settings
  SETTINGS: {
    VIEW: 'settings:view',
    EDIT: 'settings:edit',
  },

  // Finance
  FINANCE: {
    VIEW: 'finance:view',
    MANAGE: 'finance:manage',
  },

  // Admin
  ADMIN: {
    FULL_ACCESS: 'admin:full_access',
  },
} as const

/**
 * Permission groups for common use cases
 */
export const PERMISSION_GROUPS = {
  // Full Trainer Aide access
  FULL_TRAINER_AIDE: [
    PERMISSIONS.TRAINER_AIDE.VIEW_TEMPLATES,
    PERMISSIONS.TRAINER_AIDE.CREATE_TEMPLATES,
    PERMISSIONS.TRAINER_AIDE.EDIT_TEMPLATES,
    PERMISSIONS.TRAINER_AIDE.DELETE_TEMPLATES,
    PERMISSIONS.TRAINER_AIDE.ASSIGN_TO_CLIENTS,
    PERMISSIONS.TRAINER_AIDE.VIEW_PROGRESS,
    PERMISSIONS.TRAINER_AIDE.EXPORT_PROGRAMS,
    PERMISSIONS.TRAINER_AIDE.VIEW_SESSIONS,
    PERMISSIONS.TRAINER_AIDE.CREATE_SESSIONS,
    PERMISSIONS.TRAINER_AIDE.COMPLETE_SESSIONS,
  ],

  // Read-only Trainer Aide
  TRAINER_AIDE_READ_ONLY: [
    PERMISSIONS.TRAINER_AIDE.VIEW_TEMPLATES,
    PERMISSIONS.TRAINER_AIDE.VIEW_PROGRESS,
    PERMISSIONS.TRAINER_AIDE.VIEW_SESSIONS,
  ],

  // Session execution (for trainers)
  SESSION_EXECUTION: [
    PERMISSIONS.TRAINER_AIDE.VIEW_TEMPLATES,
    PERMISSIONS.TRAINER_AIDE.VIEW_SESSIONS,
    PERMISSIONS.TRAINER_AIDE.CREATE_SESSIONS,
    PERMISSIONS.TRAINER_AIDE.COMPLETE_SESSIONS,
    PERMISSIONS.TRAINER_AIDE.VIEW_PROGRESS,
  ],

  // Full client management
  FULL_CLIENT_MANAGEMENT: [
    PERMISSIONS.CLIENTS.VIEW,
    PERMISSIONS.CLIENTS.CREATE,
    PERMISSIONS.CLIENTS.EDIT,
    PERMISSIONS.CLIENTS.DELETE,
  ],

  // Full booking management
  FULL_BOOKING_MANAGEMENT: [
    PERMISSIONS.BOOKINGS.VIEW,
    PERMISSIONS.BOOKINGS.CREATE,
    PERMISSIONS.BOOKINGS.EDIT,
    PERMISSIONS.BOOKINGS.CANCEL,
  ],
} as const
